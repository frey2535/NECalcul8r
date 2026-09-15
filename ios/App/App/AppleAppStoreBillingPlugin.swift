import Foundation
import Capacitor
import StoreKit

@objc(AppleAppStoreBillingPlugin)
public class AppleAppStoreBillingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleAppStoreBillingPlugin"
    public let jsName = "AppleAppStoreBilling"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "queryProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve([
            "available": true,
            "platform": "ios"
        ])
    }

    @objc func queryProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self), !productIds.isEmpty else {
            call.reject("productIds are required.")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: Set(productIds))
                let payload = products.map { product -> [String: Any] in
                    var item: [String: Any] = [
                        "productId": product.id,
                        "title": product.displayName,
                        "description": product.description,
                        "formattedPrice": product.displayPrice
                    ]
                    if let subscription = product.subscription {
                        item["subscriptionGroupId"] = subscription.subscriptionGroupID
                    }
                    return item
                }
                call.resolve(["products": payload])
            } catch {
                call.reject("Could not load App Store products: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId")?.trimmingCharacters(in: .whitespacesAndNewlines),
              !productId.isEmpty else {
            call.reject("productId is required.")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("App Store product was not found for \(productId). Create this auto-renewable subscription in App Store Connect.")
                    return
                }

                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    let transaction = try checkVerified(verification)
                    let purchase = try await purchasePayload(from: transaction)
                    await transaction.finish()
                    call.resolve(["purchases": [purchase]])
                case .userCancelled:
                    call.reject("Purchase canceled.")
                case .pending:
                    call.reject("Purchase is pending approval.")
                @unknown default:
                    call.reject("Unknown App Store purchase result.")
                }
            } catch {
                call.reject("App Store purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                var purchases: [[String: Any]] = []
                for await entitlement in Transaction.currentEntitlements {
                    let transaction = try checkVerified(entitlement)
                    purchases.append(try await purchasePayload(from: transaction))
                }
                call.resolve(["purchases": purchases])
            } catch {
                call.reject("Could not restore App Store purchases: \(error.localizedDescription)")
            }
        }
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let safe):
            return safe
        }
    }

    private func purchasePayload(from transaction: Transaction) async throws -> [String: Any] {
        var payload: [String: Any] = [
            "productId": transaction.productID,
            "products": [transaction.productID],
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate),
            "environment": String(describing: transaction.environment)
        ]
        if let expiration = transaction.expirationDate {
            payload["expirationDate"] = ISO8601DateFormatter().string(from: expiration)
        }
        payload["signedTransaction"] = transaction.jsonRepresentation.base64EncodedString()
        return payload
    }
}
