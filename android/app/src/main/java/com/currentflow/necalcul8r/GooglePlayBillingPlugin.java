package com.currentflow.necalcul8r;

import android.app.Activity;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "GooglePlayBilling")
public class GooglePlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .build()
            )
            .setListener(this)
            .build();
    }

    @PluginMethod
    public void queryProducts(PluginCall call) {
        JSArray ids = call.getArray("productIds");
        if (ids == null || ids.length() == 0) {
            call.reject("productIds are required.");
            return;
        }
        String basePlanId = call.getString("basePlanId", "monthly");
        withBillingClient(call, () -> queryProductDetails(ids, basePlanId, call));
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        String basePlanId = call.getString("basePlanId", "monthly");
        if (productId == null || productId.trim().isEmpty()) {
            call.reject("productId is required.");
            return;
        }
        JSArray ids = new JSArray();
        ids.put(productId);
        withBillingClient(call, () -> queryProductDetailsForPurchase(productId, basePlanId, call));
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        withBillingClient(call, () -> billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build(),
            (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(billingResult.getDebugMessage());
                    return;
                }
                JSObject result = new JSObject();
                result.put("purchases", purchasesToArray(purchases));
                call.resolve(result);
            }
        ));
    }

    private void withBillingClient(PluginCall call, Runnable connected) {
        if (billingClient != null && billingClient.isReady()) {
            connected.run();
            return;
        }

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(billingResult.getDebugMessage());
                    return;
                }
                connected.run();
            }

            @Override
            public void onBillingServiceDisconnected() {
                notifyListeners("billingDisconnected", new JSObject());
            }
        });
    }

    private QueryProductDetailsParams productDetailsParams(JSArray ids) {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (int i = 0; i < ids.length(); i++) {
            String id = ids.optString(i, "");
            if (!id.isEmpty()) {
                products.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(id)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build());
            }
        }
        return QueryProductDetailsParams.newBuilder()
            .setProductList(products)
            .build();
    }

    private void queryProductDetails(JSArray ids, String basePlanId, PluginCall call) {
        billingClient.queryProductDetailsAsync(productDetailsParams(ids), (billingResult, queryResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject(billingResult.getDebugMessage());
                return;
            }
            JSObject result = new JSObject();
            result.put("products", productDetailsToArray(queryResult, basePlanId));
            call.resolve(result);
        });
    }

    private void queryProductDetailsForPurchase(String productId, String basePlanId, PluginCall call) {
        JSArray ids = new JSArray();
        ids.put(productId);
        billingClient.queryProductDetailsAsync(productDetailsParams(ids), (billingResult, queryResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject(billingResult.getDebugMessage());
                return;
            }
            ProductDetails productDetails = null;
            ProductDetails.SubscriptionOfferDetails offer = null;
            for (ProductDetails candidate : queryResult.getProductDetailsList()) {
                if (!candidate.getProductId().equals(productId)) continue;
                productDetails = candidate;
                offer = monthlyOffer(candidate, basePlanId);
                break;
            }
            if (productDetails == null || offer == null) {
                call.reject("Monthly subscription offer was not found for " + productId + ".");
                return;
            }
            pendingPurchaseCall = call;
            BillingFlowParams.ProductDetailsParams detailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(productDetails)
                .setOfferToken(offer.getOfferToken())
                .build();
            Activity activity = getActivity();
            BillingResult launchResult = billingClient.launchBillingFlow(
                activity,
                BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(Collections.singletonList(detailsParams))
                    .build()
            );
            if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                pendingPurchaseCall = null;
                call.reject(launchResult.getDebugMessage());
            }
        });
    }

    private ProductDetails.SubscriptionOfferDetails monthlyOffer(ProductDetails productDetails, String basePlanId) {
        List<ProductDetails.SubscriptionOfferDetails> offers = productDetails.getSubscriptionOfferDetails();
        if (offers == null) return null;
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            if (basePlanId.equals(offer.getBasePlanId())) return offer;
        }
        return offers.isEmpty() ? null : offers.get(0);
    }

    private JSArray productDetailsToArray(QueryProductDetailsResult queryResult, String basePlanId) {
        JSArray products = new JSArray();
        for (ProductDetails details : queryResult.getProductDetailsList()) {
            ProductDetails.SubscriptionOfferDetails offer = monthlyOffer(details, basePlanId);
            JSObject item = new JSObject();
            item.put("productId", details.getProductId());
            item.put("title", details.getTitle());
            item.put("description", details.getDescription());
            if (offer != null && !offer.getPricingPhases().getPricingPhaseList().isEmpty()) {
                ProductDetails.PricingPhase phase = offer.getPricingPhases().getPricingPhaseList().get(0);
                item.put("basePlanId", offer.getBasePlanId());
                item.put("offerToken", offer.getOfferToken());
                item.put("formattedPrice", phase.getFormattedPrice());
                item.put("priceAmountMicros", phase.getPriceAmountMicros());
                item.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                item.put("billingPeriod", phase.getBillingPeriod());
            }
            products.put(item);
        }
        return products;
    }

    private JSArray purchasesToArray(List<Purchase> purchases) {
        JSArray array = new JSArray();
        for (Purchase purchase : purchases) {
            JSObject item = new JSObject();
            item.put("orderId", purchase.getOrderId());
            item.put("packageName", purchase.getPackageName());
            item.put("purchaseToken", purchase.getPurchaseToken());
            item.put("purchaseState", purchase.getPurchaseState());
            item.put("acknowledged", purchase.isAcknowledged());
            item.put("autoRenewing", purchase.isAutoRenewing());
            JSArray products = new JSArray();
            for (String product : purchase.getProducts()) products.put(product);
            item.put("products", products);
            array.put(item);
        }
        return array;
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        JSObject result = new JSObject();
        result.put("responseCode", billingResult.getResponseCode());
        result.put("debugMessage", billingResult.getDebugMessage());
        result.put("purchases", purchasesToArray(purchases == null ? Collections.emptyList() : purchases));
        notifyListeners("purchaseUpdated", result);

        if (pendingPurchaseCall == null) return;
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
            pendingPurchaseCall.resolve(result);
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            pendingPurchaseCall.reject("Purchase canceled.");
        } else {
            pendingPurchaseCall.reject(billingResult.getDebugMessage());
        }
        pendingPurchaseCall = null;
    }
}
