'use strict';
var ImageModel = require('*/cartridge/models/product/productImages');
var priceFactory = require('*/cartridge/scripts/factories/price');
var PromotionMgr = require('dw/campaign/PromotionMgr');
var availability = require('*/cartridge/models/product/decorators/availability');
var readyToOrder = require('*/cartridge/models/product/decorators/readyToOrder');
var variationAttributes = require('*/cartridge/models/product/decorators/variationAttributes');
var preferences = require('*/cartridge/config/preferences');
/**
 * returns an array of listItemobjects bundled into an array
 * @param {dw.customer.ProductListItem} listItem - productlist Item
 * @returns {Array} an array of listItms
 */
function getBundledListItems(listItem) {
    var bundledItems = [];
    listItem.product.bundledProducts.toArray().forEach(function (bundledItem) {
        var result = {
            pid: bundledItem.ID,
            name: bundledItem.name,
            imageObj: new ImageModel(bundledItem, { types: ['small'], quantity: 'single' })
        };
        if (!bundledItem.master) {
            variationAttributes(result, bundledItem.variationModel, {
                attributes: '*',
                endPoint: 'Variation'
            });
        }
        bundledItems.push(result);
    });
    return bundledItems || [];
}

/**
 * returns an array of options of a listItem
 * @param {dw.customer.ProductListItem} listItem - productlist Item
 * @returns {Array} an array of listItms options
 */
function getOptions(listItem) {
    var options = listItem.productOptionModel ? [] : false;
    if (options) {
        listItem.productOptionModel.options.toArray().forEach(function (option) {
            var selectedOption = listItem.productOptionModel.getSelectedOptionValue(option);
            var result = {
                displayName: option.displayName,
                displayValue: selectedOption.displayValue,
                optionId: option.ID,
                selectedValueId: selectedOption.ID
            };
            options.push(result);
        });
    }
    return options;
}

/**
 * returns an array of selected options that can be passed into cart
 * @param {Object[]} options - Array of options for a given product returned from getOptions function
 * @return {Object[]} an array of selected options
 */
function getSelectedOptions(options) {
    if (options) {
        return options.map(function (option) {
            return { optionId: option.optionId, selectedValueId: option.selectedValueId };
        });
    }
    return null;
}

/**
 * Restrict the qty select drop down on wish list product card page to a minimum of total instock qty or default value
 * returns max orderable qty for item on a wish list
 * @param {dw.customer.ProductListItem} productListItemObject - Item in a product list
 * @returns {number} quantity - Number of max orderable items for this product- Default value is 10
 */
function getMaxOrderQty(productListItemObject) {
    var DEFAULT_MAX_ORDER_QUANTITY = preferences.maxOrderQty || 10;
    var availableToSell;
    if (productListItemObject.product.availabilityModel.inventoryRecord) {
        availableToSell = productListItemObject.product.availabilityModel.inventoryRecord.ATS.value;
    }
    return Math.min(availableToSell, DEFAULT_MAX_ORDER_QUANTITY);
}

/**
 * creates a plain object that contains product list item information
 * @param {dw.customer.ProductListItem} productListItemObject - productlist Item
 * @returns {Object} an object that contains information about the users address
 */
function createProductListItemObject(productListItemObject) {
    var result = {};
    var promotions;

    if (productListItemObject) {
        promotions = PromotionMgr.activeCustomerPromotions.getProductPromotions(productListItemObject.product);
        var options = getOptions(productListItemObject);
        result = {
            pid: productListItemObject.productID,
            UUID: productListItemObject.UUID,
            id: productListItemObject.ID,
            name: productListItemObject.product.name,
            minOrderQuantity: productListItemObject.product.minOrderQuantity.value || 1,
            maxOrderQuantity: getMaxOrderQty(productListItemObject),
            qty: productListItemObject.quantityValue,
            lastModified: productListItemObject.getLastModified().getTime(),
            creationDate: productListItemObject.getCreationDate().getTime(),
            publicItem: productListItemObject.public,
            imageObj: new ImageModel(productListItemObject.product, { types: ['small'], quantity: 'single' }),
            priceObj: priceFactory.getPrice(productListItemObject.product, null, true, promotions, null),
            master: productListItemObject.product.master,
            bundle: productListItemObject.product.bundle,
            bundleItems: productListItemObject.product.bundle ? getBundledListItems(productListItemObject) : [],
            options: options,
            selectedOptions: getSelectedOptions(options)
        };
        readyToOrder(result, productListItemObject.product.variationModel);
        availability(result, productListItemObject.quantityValue, productListItemObject.product.minOrderQuantity.value, productListItemObject.product.availabilityModel);
        if (!productListItemObject.product.master) {
            variationAttributes(result, productListItemObject.product.variationModel, {
                attributes: '*',
                endPoint: 'Variation'
            });
        }
    } else {
        result = null;
    }
    return result;
}

/**
 * Address class that represents an productListItem
 * @param {dw.customer.ProductListItem} productListItemObject - Item in a product list
 * @constructor
 */
function productListItem(productListItemObject) {
    this.productListItem = createProductListItemObject(productListItemObject);
}


module.exports = productListItem;
