/* jshint browser: true, esnext:true, globalstrict:true, quotmark:true, smarttabs:true, trailing:true, undef:true, latedef:true, camelcase:true, eqeqeq:true, indent:4, maxparams:3, curly:true, -W030 */
/* global $j, _, log, Backbone */


'use strict';
if (! window.dhweb) { var dhweb = {}; }
if (! dhweb.app) { dhweb.app = {}; }

/* 
* Requires Backbone.js so it must load after backbone is finished loading.
*
* See documentation at http://backbonejs.org/#Events
*/

dhweb.app.eventAggregator = _.extend({
	initialize: function(){
		log && log.debug('EventAggregator Running');
		this.on('all', function( eventName, params ){
			log && log.debug('EventAggregator Triggered <> ', eventName,' <> ', params );
		});
	}
}, Backbone.Events);

$j(document).ready(function(){
	dhweb.app.eventAggregator.initialize();
});


dhweb.app.enums = {
	ITEM_NOTIFICATION_OPEN_BLOCK: 'Item:OpenItemNotificationBlock',
	ITEM_NOTIFICATION_CLOSE_BLOCK: 'Item:CloseItemNotificationBlock',	
	ITEM_WATCH_LIST_OPEN_BLOCK: 'Item:OpenItemWatchlistBlock',
	ITEM_WATCH_LIST_CLOSE_BLOCK: 'Item:CloseItemWatchlistBlock',

	WATCH_LIST_ITEM_ADDED: 'Watchlist:ItemAdded',
	WATCH_LIST_ITEM_UPDATED: 'Watchlist:ItemUpdated',
	WATCH_LIST_ITEM_REMOVED: 'Watchlist:ItemRemoved',
	WATCH_LIST_ITEM_CHANGED: 'Watchlist:ItemChanged',

	SHOPPING_CART_ITEM_ADDED: 'ShoppingCart:ItemAdded',	
	SHOPPING_CART_ITEM_UPDATED: 'ShoppingCart:ItemUpdated',
	SHOPPING_CART_ITEM_REMOVED: 'ShoppingCart:ItemRemoved',
    SHOPPING_CART_ITEM_CHANGED: 'ShoppingCart:ItemChanged',
	SHOPPING_CART_ALL_ITEMS_UPDATED: 'ShoppingCart:AllItemsUpdated',

	TAGS_CHANGED: 'Tags:Changed',
	TAG_UPDATED: 'Tags:TagUpdated',

	ON_OFF_SWITCH_TOGGLE: 'dhweb.events.onOffSwitch.toggled'
};

dhweb.app.events = {};
dhweb.utils.addEnums( dhweb.app.events, dhweb.app.enums );