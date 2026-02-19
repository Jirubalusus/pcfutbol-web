package com.jirubalusus.pcgaffer;

import android.util.Log;
import androidx.annotation.NonNull;

import com.android.billingclient.api.*;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "Billing")
public class BillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private static final String TAG = "BillingPlugin";
    private static final String PRODUCT_ID = "remove_ads";
    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases()
                .build();
    }

    private void ensureConnected(Runnable onReady, PluginCall call) {
        if (billingClient.isReady()) {
            onReady.run();
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    onReady.run();
                } else {
                    call.reject("Billing setup failed: " + result.getDebugMessage());
                }
            }
            @Override
            public void onBillingServiceDisconnected() {
                Log.w(TAG, "Billing service disconnected");
            }
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        ensureConnected(() -> {
            List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
            productList.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(PRODUCT_ID)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build());

            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(productList)
                    .build();

            billingClient.queryProductDetailsAsync(params, (billingResult, list) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || list.isEmpty()) {
                    call.reject("Product not found: " + billingResult.getDebugMessage());
                    return;
                }

                ProductDetails productDetails = list.get(0);
                List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
                productDetailsParamsList.add(BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .build());

                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(productDetailsParamsList)
                        .build();

                pendingPurchaseCall = call;
                billingClient.launchBillingFlow(getActivity(), flowParams);
            });
        }, call);
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                handlePurchase(purchase);
            }
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            if (pendingPurchaseCall != null) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", "cancelled");
                pendingPurchaseCall.resolve(ret);
                pendingPurchaseCall = null;
            }
        } else {
            if (pendingPurchaseCall != null) {
                pendingPurchaseCall.reject("Purchase failed: " + billingResult.getDebugMessage());
                pendingPurchaseCall = null;
            }
        }
    }

    private void handlePurchase(Purchase purchase) {
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
            // Acknowledge the purchase
            if (!purchase.isAcknowledged()) {
                AcknowledgePurchaseParams ackParams = AcknowledgePurchaseParams.newBuilder()
                        .setPurchaseToken(purchase.getPurchaseToken())
                        .build();
                billingClient.acknowledgePurchase(ackParams, ackResult -> {
                    Log.d(TAG, "Purchase acknowledged: " + ackResult.getResponseCode());
                });
            }

            if (pendingPurchaseCall != null) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("productId", PRODUCT_ID);
                pendingPurchaseCall.resolve(ret);
                pendingPurchaseCall = null;
            }
        }
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        ensureConnected(() -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build();

            billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    boolean hasPremium = false;
                    for (Purchase purchase : purchases) {
                        if (purchase.getProducts().contains(PRODUCT_ID) &&
                                purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                            hasPremium = true;
                            break;
                        }
                    }
                    JSObject ret = new JSObject();
                    ret.put("premium", hasPremium);
                    call.resolve(ret);
                } else {
                    call.reject("Query failed: " + billingResult.getDebugMessage());
                }
            });
        }, call);
    }

    @PluginMethod
    public void checkPremium(PluginCall call) {
        restorePurchases(call); // Same logic
    }
}
