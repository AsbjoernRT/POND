if (typeof CartPromotion !== 'function') {

  class CartPromotion extends HTMLElement {

    constructor() {
      super();
      this.init();
    }

    init() {
      const promotionType = this.getAttribute('data-promotion-type');

      if (promotionType === 'free_shipping') {
        this.renderFreeShipping();
      } else if (promotionType === 'volume_discount') {
        this.renderVolumeDiscount();
      } else if (promotionType === 'both') {
        // Show whichever promotion is closer to completion
        this.renderBestPromotion();
      }
    }

    renderFreeShipping() {
      const freeShippingThreshold = Math.round(Number(this.getAttribute('data-free-shipping')) * (Shopify.currency.rate ? Number(Shopify.currency.rate) : 1));
      const cartTotal = Number(this.getAttribute('data-cart-total'));
      const freeShippingRemaining = cartTotal - freeShippingThreshold;

      let cartSliderWidth = 0;
      if (freeShippingRemaining < 0) {
        this.querySelector('[data-js-promotion-text]').innerHTML = window.KROWN.settings.locales.shipping_notice_remaining_to_free.replace('{{ remaining_amount }}', this._formatMoney(Math.abs(freeShippingRemaining), KROWN.settings.shop_money_format));
        cartSliderWidth = 100 - (Math.abs(freeShippingRemaining) * 100 / freeShippingThreshold);
      } else {
        this.querySelector('[data-js-promotion-text]').innerHTML = window.KROWN.settings.locales.shipping_notice_eligible_for_free;
        cartSliderWidth = 100;
      }

      if (this.querySelector('[data-js-promotion-slider]')) {
        this.querySelector('[data-js-promotion-slider]').style.width = `${cartSliderWidth}%`;
      }
    }

    renderVolumeDiscount() {
      const minQty = Number(this.getAttribute('data-volume-min-qty'));
      const discountPercentage = Number(this.getAttribute('data-volume-percentage'));
      const filterTag = this.getAttribute('data-volume-tag');
      const filterCollection = this.getAttribute('data-volume-collection');

      try {
        const cartItems = JSON.parse(this.getAttribute('data-cart-items'));
        const discounts = JSON.parse(this.getAttribute('data-cart-discounts'));

        // Count qualifying items
        const qualifyingCount = this._countQualifyingItems(cartItems, filterTag, filterCollection);
        const remaining = Math.max(0, minQty - qualifyingCount);

        // Check if volume discount is already applied
        const hasVolumeDiscount = this._hasVolumeDiscount(discounts, discountPercentage);

        let cartSliderWidth = 0;
        let message = '';

        if (hasVolumeDiscount || qualifyingCount >= minQty) {
          message = window.KROWN.settings.locales.volume_discount_eligible
            .replace('{{ discount }}', discountPercentage)
            .replace('{{ count }}', qualifyingCount);
          cartSliderWidth = 100;
        } else {
          message = window.KROWN.settings.locales.volume_discount_remaining
            .replace('{{ count }}', remaining)
            .replace('{{ discount }}', discountPercentage);
          cartSliderWidth = (qualifyingCount * 100) / minQty;
        }

        this.querySelector('[data-js-promotion-text]').innerHTML = message;

        if (this.querySelector('[data-js-promotion-slider]')) {
          this.querySelector('[data-js-promotion-slider]').style.width = `${cartSliderWidth}%`;
        }

      } catch (error) {
        console.error('Error rendering volume discount:', error);
      }
    }

    renderBestPromotion() {
      // Calculate progress for both promotions
      const freeShippingProgress = this._calculateFreeShippingProgress();
      const volumeDiscountProgress = this._calculateVolumeDiscountProgress();

      // Show the promotion that's closer to completion (or already achieved)
      if (freeShippingProgress >= volumeDiscountProgress) {
        this.renderFreeShipping();
      } else {
        this.renderVolumeDiscount();
      }
    }

    _countQualifyingItems(cartItems, filterTag, filterCollection) {
      if (!cartItems || cartItems.length === 0) return 0;

      return cartItems.reduce((count, item) => {
        // If no filter specified, count all items
        if (!filterTag && !filterCollection) {
          return count + item.quantity;
        }

        // Filter by tag
        if (filterTag && item.product_tags && item.product_tags.includes(filterTag)) {
          return count + item.quantity;
        }

        // Filter by collection (check if item has collection handle)
        if (filterCollection && item.collections) {
          const hasCollection = item.collections.some(col => col.handle === filterCollection);
          if (hasCollection) {
            return count + item.quantity;
          }
        }

        return count;
      }, 0);
    }

    _hasVolumeDiscount(discounts, percentage) {
      if (!discounts || discounts.length === 0) return false;

      // Check if any discount matches our percentage (rough match)
      return discounts.some(discount => {
        if (discount.value_type === 'percentage') {
          const discountValue = parseFloat(discount.value);
          return Math.abs(discountValue - percentage) < 1;
        }
        return false;
      });
    }

    _calculateFreeShippingProgress() {
      const threshold = Number(this.getAttribute('data-free-shipping'));
      const cartTotal = Number(this.getAttribute('data-cart-total'));
      if (!threshold) return 0;
      return Math.min(100, (cartTotal / threshold) * 100);
    }

    _calculateVolumeDiscountProgress() {
      const minQty = Number(this.getAttribute('data-volume-min-qty'));
      const filterTag = this.getAttribute('data-volume-tag');
      const filterCollection = this.getAttribute('data-volume-collection');

      try {
        const cartItems = JSON.parse(this.getAttribute('data-cart-items'));
        const qualifyingCount = this._countQualifyingItems(cartItems, filterTag, filterCollection);
        if (!minQty) return 0;
        return Math.min(100, (qualifyingCount / minQty) * 100);
      } catch (error) {
        return 0;
      }
    }

    _formatMoney(cents, format) {
      if (typeof cents === 'string') {
        cents = cents.replace('.', '');
      }

      let value = '';
      const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
      const formatString = format || moneyFormat;

      function formatWithDelimiters(number, precision, thousands, decimal) {
        thousands = thousands || ',';
        decimal = decimal || '.';

        if (isNaN(number) || number === null) {
          return 0;
        }

        number = (number / 100.0).toFixed(precision);

        const parts = number.split('.');
        const dollarsAmount = parts[0].replace(
          /(\d)(?=(\d\d\d)+(?!\d))/g,
          '$1' + thousands
        );
        const centsAmount = parts[1] ? decimal + parts[1] : '';

        return dollarsAmount + centsAmount + KROWN.settings.iso_code;
      }

      switch (formatString.match(placeholderRegex)[1]) {
        case 'amount':
          value = formatWithDelimiters(cents, 2);
          break;
        case 'amount_no_decimals':
          value = formatWithDelimiters(cents, 0);
          break;
        case 'amount_with_comma_separator':
          value = formatWithDelimiters(cents, 2, '.', ',');
          break;
        case 'amount_no_decimals_with_comma_separator':
          value = formatWithDelimiters(cents, 0, '.', ',');
          break;
        case 'amount_no_decimals_with_space_separator':
          value = formatWithDelimiters(cents, 0, ' ');
          break;
        case 'amount_with_apostrophe_separator':
          value = formatWithDelimiters(cents, 2, "'");
          break;
      }

      return formatString.replace(placeholderRegex, value);
    }

  }

  if (typeof customElements.get('cart-promotion') == 'undefined') {
    customElements.define('cart-promotion', CartPromotion);
  }

}
