/* jshint browser: true, camelcase: true, eqeqeq: true, indent:4, undef: true, maxparams:3, -W030 */
/* global $j, _, log, bootbox */

/*
 * jQuery is set to $j to prevent conflict with legacy code.
 * 
 * -W030 is for "Expected an assignment or function call and instead saw an expression" triggered by the log && log.debug("text") lines. 
 * If log is undefined then the JS shortcuts past the debug statement. See perf tests at:
 *     https://jsperf.com/logging-overhead-test
 *     https://jsperf.com/logging-performance-in-function
 */

if (! window.dhweb) { var dhweb = {}; }
if (! dhweb.myWatchlist) { dhweb.myWatchlist = {}; }

/*
* TABLE OF CONTENTS
* -----------------
* Normal and Edit Mode Page Level Handlers
* Normal Mode - Page Level Handlers
* Normal Mode - Item Level Handlers
* Normal Mode - Edit Tag Names Handlers
* Edit Mode Handlers
* Paging Handlers
* Normal and Edit Mode Page Level Functions
* Normal Mode - Page Level Functions
* Normal Mode - Item Level Functions
* Normal Mode - Edit Tag Names Functions
* Edit Mode Functions
* Paging Functions
*/

dhweb.myWatchlist = {        
    logClass: 'dhweb.myWatchlist',
    overlays: {}, /*  Overlays holds jQuery elements referenced by itemNo, Each is an overlay used to tint the home availability block  */
    filterInStock: "false",
    firstInitialization: true,
    currentPage: 1,
    isAnyTagNameChanged: false,
    isDiscontinuedItemEmailValid: true, /* Assume that previous emails would be valid and that account email is valid */
    $editTagNameModal: null,

    initialize: function() 
    {     
        log && log.debug(this.logClass + '.initialize()');
        this.$editTagNameModal = $j('#editTagNameModal');

        // Normal and Edit Mode Page Level Bindings             
        $j('#sortOption').on('change', $j.proxy(this.handleSortOptionChange, this));
        $j('#perPageOption').on('change', $j.proxy(this.handlePerPageOptionChange, this));              
 
        dhweb.app.eventAggregator.on( dhweb.app.events.ON_OFF_SWITCH_TOGGLE(), this.handleSlidertoggle, this );        
        dhweb.app.eventAggregator.on( dhweb.app.events.WATCH_LIST_ITEM_ADDED(), this.handleItemAddedEvent, this );
        dhweb.app.eventAggregator.on( dhweb.app.events.WATCH_LIST_ITEM_UPDATED(), this.handleItemUpdatedEvent, this );
        dhweb.app.eventAggregator.on( dhweb.app.events.WATCH_LIST_ITEM_REMOVED(), this.handleItemRemovedEvent, this );
        dhweb.app.eventAggregator.on( dhweb.app.events.TAG_UPDATED(), this.handleTagUpdatedEvent, this );
        dhweb.app.eventAggregator.on( dhweb.app.events.TAGS_CHANGED(), this.updateTagFilters, this ); 

        // Discontined Item Notifications
        $j('.discontinued-modal-set').on('vclick', $j.proxy(this.handleDiscontinuedNotificationSetClick, this));
        $j('.discontinued-modal-cancel').on('vclick', function(){
            $j('#discontinuedItemSlider').removeClass('active');
        });
        $j.validate({ form: '#discontinuedNotificationForm' });         
        // TODO remove this piece of crap, no API validator     
        $j('#discontinuedItemEmail').bind('validation', function(evt, isValid){
            log && log.trace(this.logClass + " validate discontinued item email: " + isValid);
            dhweb.myWatchlist.isDiscontinuedItemEmailValid = isValid;
        });

        // Normal Mode - Page Level Bindings
        $j('#deselectAllTagsButton').on('vclick', $j.proxy(this.handleDeselectAllTagsClick, this));        

        // Normal Mode - Edit Tag Names Bindings
        $j('#editTagNamesButton').on('vclick', $j.proxy(this.handleEditTagNamesClick, this));
        this.$editTagNameModal.delegate('.edit-tag-edit-button', 'vclick', $j.proxy(this.handleEditTagNamesEditButtonClick, this));
        this.$editTagNameModal.delegate('.edit-tag-update-button', 'vclick', $j.proxy(this.handleEditTagNamesUpdateButtonClick, this));
        this.$editTagNameModal.delegate('.edit-tag-cancel-button', 'vclick', $j.proxy(this.handleEditTagNamesCancelButtonClick, this));
        this.$editTagNameModal.delegate('.edit-tag-delete-button', 'vclick', $j.proxy(this.handleEditTagNamesDeleteButtonClick, this));
        this.$editTagNameModal.on('hide.bs.modal', $j.proxy(this.handleEditTagNamesClosed, this));        

        if( this.isEditModeActive() ) {
            this.initializeForEdit();    
        } else {
            this.initializeForNormal();
        }
    },

    initializeForNormal: function() 
    {
        log && log.debug(this.logClass + '.initializeNormal()');
               
        // Normal Mode - Item Level Bindings
        $j('.show-branches').on('vclick', $j.proxy(this.handleShowBranchesClick, this));
        $j('.hide-branches').on('vclick', $j.proxy(this.handleHideBranchesClick, this));        

        // Show/Hide edit button
        if( this.isWatchlistEmpty() ){
            $j('.edit-mode-button').hide();
        } else {
            $j('.edit-mode-button').show();            
        }

        // Initialize item triggers on the new list
        dhweb.app.itemController.initializeViews($j('#hasresults'), 'Watch List');
        this.updateTagFilters(); 
        this.initializePaging();      
    },

    initializeForEdit: function() 
    {
        log && log.debug(this.logClass + '.initializeForEdit()');
        
        // Edit Mode - Item Level Bindings
        $j('.edit-mode-cancel').on('vclick', $j.proxy(this.handleCancelClick, this));
        $j('.edit-mode-single-item').on('vclick', $j.proxy(this.handleItemClick, this));
        if( this.firstInitialization ) {
            this.firstInitialization = false;
            $j('.edit-mode-select-all').on('vclick', $j.proxy(this.handleSelectAllClick, this));
            $j('.edit-mode-delete-selected').on('vclick', $j.proxy(this.handleDeleteSelectedClick, this));
            //TODO what is this for $j('.edit-mode-cancel').on('hide.bs.modal', $j.proxy(this.handleCancelClick, this));
        }       

        if( this.getWatchlistItemCount() > 10 ){
            $j(".button-row:last-of-type").css( "display", "block" );
        } else {
            $j(".button-row:last-of-type").css( "display", "none" );
        }

        if( this.isWatchlistEmpty() ){
            $j('.edit-mode-select-all').addClass('disabled');
            $j('.edit-mode-delete-selected').addClass('disabled');
        } else {
            $j('.edit-mode-select-all').removeClass('disabled');
            $j('.edit-mode-delete-selected').removeClass('disabled');
        }

        this.updateSelectAll();
        this.updateTagFilters();
        this.initializePaging();
    },

    initializePaging: function() 
    {
        log && log.debug(this.logClass + '.initializePaging()'); 
        $j('.paging-button').off('vclick', $j.proxy(this.handlePagingClick, this));
        $j('.paging-button').on('vclick', $j.proxy(this.handlePagingClick, this));
    },

    /*
    ====================================================================================================
    Normal and Edit Mode Page Level Handlers
    ====================================================================================================
    */
    handleSortOptionChange: function( event )
    {
        event.preventDefault();
        event.stopPropagation();

        log && log.debug(this.logClass + '.handleSortOptionChange()');
        
        var dataSet = {
            method: 'WatchlistFilterChanged',
            renderMode: 'myWatchlistAsync'
        };
        dataSet = _.extend(this.getRequestParamSet(), dataSet);
        this.requestPageUpdate( dataSet );
    },

    handlePerPageOptionChange: function( event )
    {
        event.preventDefault();
        event.stopPropagation();

        log && log.debug(this.logClass + '.handlePerPageOptionChange()');
        
        var dataSet = {
            method: 'WatchlistFilterChanged',
            renderMode: 'myWatchlistAsync'
        };
        dataSet = _.extend(this.getRequestParamSet(), dataSet);
        this.requestPageUpdate( dataSet );
    },

    handleSlidertoggle: function( event )
    {
        /* 
        * Check if this event is for a slider on this page 
        * Both sliders will trigger a fresh page update
        */

        log && log.debug(this.logClass + '.handleSlidertoggle()');
        var id = event.toggleId;
        if( id === 'inStockSlider' )
        { 
            this.filterInStock = event.isOn;
            this.requestPageUpdate();
        }

        if( id === 'discontinuedItemSlider' ){
            if( event.isOn ){
                $j('#discontinuedItemNotificationModal').modal('show');      
                $j('#discontinuedItemEmail').focus(); // Force uslessly bad validator to check the field
            } else {
                bootbox.dialog({
                    message: "Are you sure you want to turn off discontinued item notifications?",
                    title: "Are you sure?",
                    buttons: 
                    {
                        no: {
                            label: "Cancel",
                            className: "btn-default",
                            callback: $j.proxy( function(){
                                $j('#' + event.toggleId).toggleClass('active');
                            }, this)
                        },
                        yes: 
                        {
                            label: "Remove",
                            className: "btn-primary",
                            callback: function(){
                                log && log.debug(this.logClass + ' Remove Discontinued Item Notification');
                                $j.ajax({
                                    type: 'POST',
                                    url: '/v4/asyncData?method=RemoveDiscontinuedItemNotification'
                                });
                            }
                        }
                    }
                });
            }
        }
    },

    handleTagsUtilityUpdatedEvent: function( event )
    {
        log && log.debug(this.logClass + '.handleTagsUtilityUpdatedEvent()');
        this.requestPageUpdate();
    },

    handleItemAddedEvent: function( event )
    {
        log && log.debug(this.logClass + '.handleItemAddedEvent()');
        this.requestPageUpdate();      
    },

    handleItemRemovedEvent: function( event )
    {
        log && log.debug(this.logClass + '.handleItemRemovedEvent()');
        this.requestPageUpdate();      
    },

    handleItemUpdatedEvent: function( event )
    {
        log && log.debug(this.logClass + '.handleItemUpdatedEvent()');
        this.requestPageUpdate();      
    },

    handleDeselectAllTagsClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();
        log && log.debug(this.logClass + '.handleDeselectAllTagsClick()');
        
        var $curTarget = $j(event.currentTarget);        
        this.deselectAllTags();
    },

    handleTagsFilterClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();
        log && log.debug(this.logClass + '.handleTagsFilterClick()');
        
        var $curTarget = $j(event.currentTarget);

        if( $curTarget.hasClass('active-refinement') ) 
        {
            $curTarget.removeClass('active-refinement');
            dhweb.app.tagController.tags.setTagProperty( $curTarget.data('tagId'), 'selected', false );
        } else {            
            $curTarget.addClass('active-refinement');
            dhweb.app.tagController.tags.setTagProperty( $curTarget.data('tagId'), 'selected', true );
        }
        
        this.requestPageUpdate();
    },  

    handleDiscontinuedNotificationSetClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();
        log && log.debug(this.logClass + '.handleDiscontinuedNotificationSetClick()');

        var $email = $j('#discontinuedItemEmail');

        if( !this.isDiscontinuedItemEmailValid ){
            return false;
        }

        log && log.debug(this.logClass + ' Add Discontinued Item Notification using email: ' + $email.val() );
        $j.ajax({
            type: 'POST',
            url: '/v4/asyncData',
            data: {
                method: 'AddUpdateDiscontinuedItemNotification',
                emailAddress: $email.val()
            },
            context: this,
            complete:  function( jqXHR, textStatus )
            {                
                log && log.debug(this.logClass + ".handleDiscontinuedNotificationSetClick() AjaxComplete");
                var $json = $j.parseJSON(jqXHR.responseText);          

                if( $json.success ){
                    $j('#discontinuedItemNotificationModal').modal('hide');
                    $j('#discontinuedItemNotificationModal').find('.alert').css('display', 'none');
                } else {
                    $j('#discontinuedItemNotificationModal').find('.alert').css('display', 'block').html( $json.message );
                }
            }

        }); 
    },    

    /*
    ====================================================================================================
    Normal Mode - Item Level Handlers
    ====================================================================================================
    */

    handleShowBranchesClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();

        log && log.debug(this.logClass + '.handleShowBranchesClick()');
        
        var $curTarget = $j(event.currentTarget);
        this.showBranches($curTarget.data('itemNo'));
    },

    handleHideBranchesClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();

        log && log.debug(this.logClass + '.handleHideBranchesClick()');
        
        var $curTarget = $j(event.currentTarget);
        this.hideBranches($curTarget.data('itemNo'));
    },

    /*
    ====================================================================================================
    Normal Mode - Edit Tag Names Handlers
    ====================================================================================================
    */

    handleEditTagNamesClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();
        log && log.debug(this.logClass + '.handleEditTagNamesClick()');
        
        this.editTagNamesOpenModal();
    }, 

    handleEditTagNamesEditButtonClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();
        log && log.debug(this.logClass + '.handleEditTagNamesEditButtonClick()');
        
        var $curTarget = $j(event.currentTarget),
            $tagLineElement = $curTarget.closest('.edit-tag-line');            

        this.editTagNamesEditMode( $tagLineElement );        
    },

    handleEditTagNamesCancelButtonClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();
        log && log.debug(this.logClass + '.handleEditTagNamesCancelButtonClick()');
        
        var $curTarget = $j(event.currentTarget),
            $tagLineElement = $curTarget.closest('.edit-tag-line');            

        this.editTagNamesCancelEditMode( $tagLineElement );        
    },

    handleEditTagNamesUpdateButtonClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();
        log && log.debug(this.logClass + '.handleEditTagNamesUpdateButtonClick()');
        
        var $curTarget = $j(event.currentTarget),
            $tagLine,
            tagId, 
            tagName;

        $tagLine = $curTarget.closest('.edit-tag-line');
        tagId = $tagLine.data('tagId');
        tagName = $tagLine.find('.edit-tag-name-field').val();
        dhweb.app.tagController.updateTag( tagId, tagName, 'update');
    },

    handleEditTagNamesDeleteButtonClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();
        log && log.debug(this.logClass + '.handleEditTagNamesDeleteButtonClick()');
        
        var $curTarget = $j(event.currentTarget),
            $tagLine,
            tagId;

        $tagLine = $curTarget.closest('.edit-tag-line');
        tagId = $tagLine.data('tagId');
        dhweb.app.tagController.updateTag( tagId, '', 'delete' );
    },

    handleEditTagNamesClosed: function( event )
    {
        /* NOTE: Do not stop default or propagation since they are needed to close the modal */
        log && log.debug(this.logClass + '.handleEditTagNamesClosed()');
        
        // If any tags were changed the page needs to be refreshed
        if( this.isAnyTagNameChanged )
        {
            this.requestPageUpdate();
        }
    },

    handleTagUpdatedEvent: function( event ){
        log && log.debug(this.logClass + '.handleTagUpdatedEvent()');
        this.isAnyTagNameChanged = true;
        if( event.tagMethod === 'delete' ){
            $j('.tag-id-' + event.tagId ).remove();
        } else {
            this.editTagNamesDisplayMode( $j('.tag-id-' + event.tagId ) );
        }
    },

    /*
    ====================================================================================================
    Edit Mode Handlers
    ====================================================================================================
    */

    handleItemClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();
        log && log.debug(this.logClass + '.handleItemClick()'); 
        
        var $curTarget = $j(event.currentTarget);      
        $curTarget.toggleClass('selected');
        this.updateSelectAll();
    },

    handleSelectAllClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();
        log && log.debug(this.logClass + '.handleSelectAllClick()'); 

        var $curTarget = $j(event.currentTarget);
        if( $curTarget.hasClass('deselector') ) {
            $j('.edit-mode-single-item.selected').removeClass('selected');              
            this.setSelectAll(true);
        } else {
            $j('.edit-mode-single-item:not(.selected)').addClass('selected');  
            this.setSelectAll(false);
        }                 
    },

    handleDeleteSelectedClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();
        log && log.debug(this.logClass + '.handleDeleteSelectedClick()');        
        
        var $selectedElements = $j('.edit-mode-single-item.selected'),
            confirmMsg;

        if( $selectedElements.length < 1 ) { return false; }

        if( $selectedElements.length === 1 ) { 
            confirmMsg = "Are you sure you want to remove this item from your Watch List?"; 
        } else {
            confirmMsg = "Are you sure you want to remove these items from your Watch List?"; 
        }

        bootbox.dialog({
            message: confirmMsg,
            title: "Are you sure?",
            buttons: 
            {
                no: {
                    label: "Cancel",
                    className: "btn-default"
                },
                yes: 
                {
                    label: "Remove",
                    className: "btn-primary",
                    callback: $j.proxy(function() {
                        this.confirmRemoveItemsFromWatchlist( $selectedElements );
                    }, this)
                }
            }
        });
    },

    handleCancelClick: function( event )
    {
        event.preventDefault();
        event.stopPropagation();

        log && log.debug(this.logClass + '.handleCancelClick()');        
        window.location.replace(document.location.origin + '/v4/view?pageReq=myWatchlist');      
    },

    /*
    ====================================================================================================
    Paging Handlers
    ====================================================================================================
    */

    handlePagingClick: function( event ) 
    {
        event.preventDefault();
        event.stopPropagation();
        log && log.debug(this.logClass + '.handlePagingClick()');
        
        var page, $curTarget = $j(event.currentTarget);
        page = dhweb.utils.getNewPageViaPagingButton( $curTarget );
        if( page !== null ) {
            this.pagination( page );
        }
    },
    
    /*
    ====================================================================================================
    Normal and Edit Mode Page Level Functions
    ====================================================================================================
    */

    isWatchlistEmpty: function()
    {
        return ( this.getWatchlistItemCount() < 1 );
    },

    isEditModeActive: function()
    {
        return ( $j('#hasResultsEdit').length > 0 );
    },


    getWatchlistItemCount: function()
    {
        if( this.isEditModeActive() ){
            return $j('#hasResultsEdit .edit-mode-single-item').length;
        } else {
            return $j('#hasresults .single-item-display').length;    
        }    
    },

    getOverlayContentElement: function( message, hasRotator )
    {
        log && log.debug(this.logClass + '.getOverlayContent(', message, hasRotator, ')');
        var strBuilder = [];
        strBuilder.push("<div class='watchlist-overlay-msg'>");
        if( hasRotator ){            
            strBuilder.push("<img class='display-inline-block' src='/images/dandhWeb/rotator.gif' alt='loading'>");
        }
        strBuilder.push("<div class='display-inline-block'>" + message + "</div>");
        strBuilder.push("</div>");
        return $j( strBuilder.join("") );
    },
    
    updateTagFilters: function()
    {
        log && log.debug(this.logClass + '.updateTagFilters()');

        var $badgeLineTemplate = $j('.badgeline-refinement.template'),
            $badgeLineContainer = $j('.tags-refinement-container'),
            $newBadgeLine,
            untagged = dhweb.app.tagController.tags.getTagById('11111111-2222-3333-4444-555555555555'),
            tagsInAlphaOrder;

        // Clear the Container
        $badgeLineContainer.html(''); 

        // Clone and append a new badge line for each tag
        tagsInAlphaOrder = dhweb.app.tagController.tags.getRealTags();
        _.each( tagsInAlphaOrder, function( tag ){
            $newBadgeLine = $badgeLineTemplate.clone( true, true );
            $newBadgeLine = this.generateBadgeLineFromTemplate( $newBadgeLine, tag );
            $badgeLineContainer.append( $newBadgeLine );
        }, this );          

        // Add Special Items Untaggged Line
        $badgeLineContainer.append( $j('<div>&nbsp;</div>') );
        $newBadgeLine = $badgeLineTemplate.clone( true, true );
        $newBadgeLine = this.generateBadgeLineFromTemplate( $newBadgeLine, untagged );
        $badgeLineContainer.append( $newBadgeLine );

        // Hide/SHow the Edit Tags button based on if there are any tags
        if( tagsInAlphaOrder.length === 0 ){
            $j('#editTagNamesButton').hide();
        } else {
            $j('#editTagNamesButton').show();
        }

        // Hide/Show the Deselect Tags button based on if there are any tags selected
        if( $j('.badgeline-refinement.active-refinement').length === 0 ){
            $j('#deselectAllTagsButton').hide();
        } else {
            $j('#deselectAllTagsButton').show();
        }
    },

    generateBadgeLineFromTemplate: function( $newBadgeLine, tag )
    {
        log && log.trace(this.logClass + '.generateBadgeLineFromTemplate()');

        $newBadgeLine.removeClass( 'template' );
        $newBadgeLine.addClass( 'tag-id-' + tag.getId() );
        if( tag.getCount() === 0 ) 
        {
            $newBadgeLine.addClass('muted');
        }        
        $newBadgeLine.attr( 'data-tag-id', tag.getId() );        
        if( tag.isSelected() )
        {
           $newBadgeLine.addClass('active-refinement');
        }        
        $newBadgeLine.find('.refine-text').html('<span title="' + tag.getName() + '">' + tag.getName() + '</span>');
        $newBadgeLine.find('.refine-count').html( tag.getCount() );
        $newBadgeLine.bind('vclick', $j.proxy(this.handleTagsFilterClick, this));
        
        return $newBadgeLine;
    },

    deselectAllTags: function()
    {
        log && log.debug(this.logClass + '.deselectAllTags()');

        $j('.badgeline-refinement.active-refinement').removeClass('active-refinement');
        dhweb.app.tagController.tags.deselectAllTags();
        this.requestPageUpdate();
    },

    getRequestParamSet: function() 
    {
        log && log.debug(this.logClass + '.getRequestParamSet()');

        var dataSet = {
            method: 'WatchlistFilterChanged',
            renderMode: 'myWatchlistAsync',
            pageNumber: this.currentPage,
            itemsPerPage: $j('#perPageOption').val(),
            sortOrder: $j('#sortOption').val(),
            filterInStock: this.filterInStock,
            selectedTags: dhweb.app.tagController.tags.getSelectedTagIds().join(',')
        };        
        return dataSet;
    },

    requestPageUpdate: function( dataSet )
    {                
        log && log.debug(this.logClass + '.requestPageUpdate()');

        dataSet = ( typeof dataSet === "undefined" ) ? this.getRequestParamSet() : dataSet ;        
        log && log.debug('dataSet: ', dataSet);
        var $message = this.getOverlayContentElement( "Please Wait... Loading Watch List", true );
        
        if( $j('.myWatchlist-ns').length ){
            // Opening as a modal window, re-wrap the message so it doesn't have the autocentering class anymore
            bootbox.dialog({
                message: $j("<div class='watchlist-msg'>").html( $message.html() ),
                title: "&nbsp;",
                closeButton: false,
                buttons: {}
            });  
        } else {
            // Opening as an overlay on the quick order subsection
            dhweb.utils.overlayElement({
                $targetElement: $j('#watchlistSection'),
                contents: $message,
                backgroundColor: '255,255,255',
                opacity: 0.6, 
                includePadding: true
            });
        }
        
        $j.ajax({
            type: 'POST',
            url: '/v4/asyncData',
            data: dataSet, 
            context: this,
            complete: this.renderWatchlistHTML
        });
    },

    renderWatchlistHTML: function( jqXHR, textStatus ) 
    {
        log && log.debug(this.logClass + '.renderWatchlistHTML()');
        
        var $responseText = $j(jqXHR.responseText),
            $pagination = $responseText.find('#pagination'),
            $results = $responseText.find('#results'),
            $resultsEditMode = $responseText.find('#resultsEditMode');

        // Update pagination
        if( $pagination.length > 0 ) {
            this.currentPage = $pagination.data('page');
            $j('.paging-div').html($pagination.html());
        }
                
        if(  this.isEditModeActive() ) {
            // Update current result list with the new list
            $j("#hasResultsEdit").html($resultsEditMode.html());
            dhweb.app.tagController.refreshWatchlistTags();
            this.initializeForEdit();            
        } else {                
            // Replace the current result list with the new list
            $j("#hasresults").html($results.html());            
            this.initializeForNormal();
        }

        // Remove overlays
        bootbox.hideAll();
        dhweb.utils.removeAllOverlayElements();
    },

    /*
    ====================================================================================================
    Normal Mode - Page Level Functions
    ====================================================================================================
    */


    
    /*
    ====================================================================================================
    Normal Mode - Item Level Functions
    ====================================================================================================
    */

    hideAllSlideOuts: function()
    {
        log && log.debug(this.logClass + '.hideAllSlideOuts()');
        
        _.forEach( $j('.all-branches:visible'), function( element ) {
            this.hideBranches( $j(element).data('itemNo') );
        }, this );   

        // Clear all popovers to remove irrelevant error messages
        $j('.popover').remove();     
    },

    hideBranches: function( itemNo ) 
    {
        log && log.debug(this.logClass + '.hideBranches()');

        this.overlays[itemNo].remove();
        $j('#addForm' + itemNo).find("input[name='qty']").val('');
        $j('#all-branches-' + itemNo).hide();
    },


    showBranches: function( itemNo ) 
    {
        log && log.debug(this.logClass + '.showBranches()');
        
        var $addForm = $j('#addForm' + itemNo),
            $itemLine = $j('#item-line-' + itemNo),
            $allBranches = $j('#all-branches-' + itemNo);

        this.hideAllSlideOuts();
        $addForm.find("input[name='qty']").val('');
        this.overlays[itemNo] = dhweb.utils.overlayElement({
            $targetElement: $j('#home-branch-' + itemNo),
            contents: '',
            backgroundColor: '255,255,255',
            opacity: 0.6, 
            includePadding: true
        });
        this.overlays[itemNo].bind('vclick', dhweb.utils.disableClicking);
        $allBranches.css({
            'min-height': $itemLine.outerHeight() + 'px',
            'margin-top': $itemLine.offset().top - $addForm.offset().top + 'px'
        });
        $allBranches.show();
        dhweb.app.itemController.getItemInventory( itemNo );
    }, 

    /*
    ====================================================================================================
    Normal Mode - Edit Tag Names Functions
    ====================================================================================================
    */

    editTagNamesOpenModal: function()
    {
        log && log.debug(this.logClass + '.editTagNamesOpenModal()');

        var $tagLineElementTemplate = $j('.edit-tag-line.template'),
            $tagListDiv = $j('.edit-tag-list'),
            $currentLine;

        // Empty out the list and reset change tracker
        $tagListDiv.html('');
        this.isAnyTagNameChanged = false;

        // Add one line for each tag 
        _.each( dhweb.app.tagController.tags.getRealTags(), function( tag ){
            $currentLine = $tagLineElementTemplate.clone( true, true );
            $currentLine.removeClass( 'template' );
            $currentLine.addClass( 'tag-id-' + tag.getId() );
            $currentLine.attr( 'data-tag-id', tag.getId() );
            $currentLine.attr( 'data-tag-name-original', tag.getName() );
            $currentLine.find('.edit-tag-name-field').val( tag.getName() );
            $tagListDiv.append( $currentLine );
        }, this );      

        $j('#editTagNameModal').modal('show');
    },

    editTagNamesEditMode: function( $tagLineElement )
    {
        log && log.debug(this.logClass + '.editTagNamesEdit()');
        $tagLineElement.find('.edit-tag-name-field').prop('disabled', false);
        $tagLineElement.find('.edit-tag-edit-button').hide();
        $tagLineElement.find('.edit-tag-cancel-button').show();
        $tagLineElement.find('.edit-tag-update-button').show();
    },

    editTagNamesDisplayMode: function( $tagLineElement )
    {
        log && log.debug(this.logClass + '.editTagNamesDisplayMode()');
        $tagLineElement.find('.edit-tag-name-field').prop('disabled', true);
        $tagLineElement.find('.edit-tag-cancel-button').hide();
        $tagLineElement.find('.edit-tag-update-button').hide();  
        $tagLineElement.find('.edit-tag-edit-button').show();           
    },

    editTagNamesCancelEditMode: function( $tagLineElement )
    {
        log && log.debug(this.logClass + '.editTagNamesCancelEditMode()');
        $tagLineElement.find('.edit-tag-name-field').prop('disabled', true).val( $tagLineElement.data('tagNameOriginal') );
        $tagLineElement.find('.edit-tag-cancel-button').hide();
        $tagLineElement.find('.edit-tag-update-button').hide();  
        $tagLineElement.find('.edit-tag-edit-button').show();                 
    },    

    /*
    ====================================================================================================
    Edit Mode Functions
    ====================================================================================================
    */

    /* In Edit Mode this toggles between Select All and Deselect All buttons */
    setSelectAll: function( isSelectAll ) 
    {    
        log && log.trace(this.logClass + '.setSelectAll(', isSelectAll, ')');
        
        var buttons = $j('.edit-mode-select-all');
        if( isSelectAll ) {
            buttons.removeClass('deselector');
        } else {
            buttons.addClass('deselector');
        }
    },

    updateSelectAll: function() 
    {
        log && log.debug(this.logClass + '.updateSelectAll()');
        if( $j('.edit-mode-single-item.selected').length ===  parseInt($j('#perPageOption').val()) ) {
            this.setSelectAll(false);
        } else {
            this.setSelectAll(true);
        }
    },

    confirmRemoveItemsFromWatchlist: function( $selectedElements )
    {
        log && log.debug(this.logClass + '.confirmRemoveItemsFromWatchlist()');
        var itemList = _.map( $selectedElements, function( itemElement ){ 
            return $j(itemElement).data('itemNo'); 
        }, this);
        itemList = itemList.join(';');

        var dataSet = {
            method: 'DeleteWatchlistItems',
            renderMode: 'myWatchlistAsync'
        };
        dataSet = _.extend(this.getRequestParamSet(), dataSet);
        dataSet.deletedItemNumbers = itemList;
                
        this.requestPageUpdate( dataSet ); 
    },

    /*
    ====================================================================================================
    Paging Functions
    ====================================================================================================
    */
 
    pagination: function( page ) 
    {
        log && log.debug(this.logClass + '.pagination()');
        
        page = ( page === 'NEXT' ) ? this.currentPage + 1 : page;
        page = ( page === 'PREV' ) ? this.currentPage - 1 : page;

        var dataSet = {
            method: 'WatchlistFilterChanged',
            renderMode: 'myWatchlistAsync',
            pageNumber: page
        };
        dataSet = _.extend(this.getRequestParamSet(), dataSet);

        this.requestPageUpdate( dataSet );
    }    
};

$j(document).ready(function() {
    dhweb.myWatchlist.initialize();
});