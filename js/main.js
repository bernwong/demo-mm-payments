var gAcctNumber = 2;
var gDynamicGrammarRootUrl = "grammars/dynamicgram.pl";
var gMerchantDelim = "<DELIM>";


var Demo = Demo || {};
Demo.Payments = {};
Demo.Payments.prompts = {
    'mainmenu': 'audio/MainMenu.wav',
    'payment':  'audio/MakeAPayment.wav',
    'acctfrom': 'audio/SelectPaymentAccount.wav',
    'acctadd':  'audio/AddNewAccount.wav'
};


function prompt(screen) {
    if (typeof Demo.Payments.prompts[screen] !== 'undefined') {
        NativeBridge.playAudio(Demo.Payments.prompts[screen]);
        return true;
    }
    NativeBridge.log('[prompt] cannot find WAV for "' + screen + '"');
    return false;
}

//-----------------------------------------------------------------------------

function load() {
    AccountData.account.setDefaultPaymentDates();
    AccountData.account.setDefaultPayment();
    NativeBridge.onInitialize(nbInitialize);
}

function nbInitialize(o) {
}

function emptyGrammarHandler(result) {
}

function print_event(event, data) {
    console.log(event.target.id + ': ' + event.type + ' @ ' + event.timeStamp);
    if (! event.target || ! event.target.id) {
        console.log(event);
    }
    //console.log(data);
}

//-----------------------------------------------------------------------------

var mainmenu_prompted = false;

function mainmenu_grammar() {
    return 'grammars/mainmenu.grxml';
}


function mainmenu_setGrammar(message) {
    NativeBridge.setMessage(message);
    NativeBridge.setGrammar(mainmenu_grammar(), null, mainmenu_grammarHandler);
}


function mainmenu_beforeshow() {
    AccountData.account.init(gAcctNumber);
    AccountData.account.initDropdown('last-4-digits-main', false);
}


function mainmenu_show() {
    mainmenu_setGrammar('Would you like to make a payment?');
    if (! mainmenu_prompted) {
        prompt('mainmenu');
        mainmenu_prompted = true;
    }
    reset_rating();
}


function mainmenu_beforehide() {
    NativeBridge.cancelAudio();
}


function mainmenu_grammarHandler(result) {
    var interpretation;

    NativeBridge.log('[MainMenu] ' + JSON.stringify(result));

    if (result === null || result.length === 0) {
        mainmenu_setGrammar('What?');

    } else {
        interpretation = result[0].interpretation;

        switch (interpretation.action) {
        case 'make payment':
            $.mobile.changePage($('#payment'));
            break;

        case 'no':
            NativeBridge.setMessage(null);
            mainmenu_setGrammar('How can I help you today?');
            break;

        default:
            NativeBridge.log('[MainMenu] unknown action: "' +
                             interpretation.action + '"');
            acctadd_setGrammar('What?');
	    break;
        }
    }
}


function make_test_result(action, options) {
    var result = { action: action };
    if (options) {
        for (var opt in options) {
            result[opt] = options[opt];
        }
    }
    return [result];
}


//-----------------------------------------------------------------------------

var payment_prompted = false;

function payment_grammar() {
  return 'grammars/make_payment.grxml';
}


function payment_setGrammar(message) {
    NativeBridge.setMessage(message);
    NativeBridge.setGrammar(payment_grammar(), null, payment_grammarHandler);
}


function payment_beforeshow(event, data) {
  NativeBridge.setMessage(null);
 
  AccountData.account.initDropdown('last-4-digits-payment', false);
  AccountData.account.populate_src_acct_info(); 
  AccountData.account.initPmtOptsDropdown('list-payment-amount', false);

  $('#datebox').hide();

  return false;
}


function payment_show() {
    $('#pmtdatehidden').bind('datebox', function(e, p) {
        if (p.method === 'close') {
            if ($('#pmtdatehidden').val() !== '') { 
                $('#pmtdate').val($('#pmtdatehidden').val());
                AccountData.account.updateEstDate();
            }
        }
    });

    payment_setGrammar(null);

    if (! payment_prompted) {
        payment_prompted = true;
        prompt('payment');
    }
}

function payment_beforehide() {
    NativeBridge.cancelAudio();
}


var DaysOfTheWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function relative_date(date) {
    var now_msec = Date.now(),
        new_date = null,
        day_indx = 0,
        days_off = 0;

    date = date.toLowerCase();

    // Today
    if (date === 'today') {
        new_date = new Date();

    // Tomorrow
    } else if (date === 'tomorrow') {
        now_msec += (24 * 60 * 60 * 1) * 1000;
        new_date = new Date(now_msec);

    // The day after
    } else if (date === 'the day after') {
        now_msec += (24 * 60 * 60 * 2) * 1000;
        new_date = new Date(now_msec);

    // Monday, Tuesday, etc.
    } else if (DaysOfTheWeek.indexOf(date) != -1) {
        day_indx = DaysOfTheWeek.indexOf(date);
        new_date = new Date();
        if (day_indx < new_date.getDay()) {
            days_off = day_indx + 7 - new_date.getDay();
        } else if (day_indx > new_date.getDay()) {
            days_off = day_indx - new_date.getDay();
        } else {
            days_off = 7;
        }
        now_msec += (24 * 60 * 60 * days_off) * 1000;
        new_date = new Date(now_msec);
    }

    if (new_date !== null) {
        return month[new_date.getMonth()] + ' ' +
               new_date.getDate() + ', ' +
               new_date.getFullYear();
    }

    // Error
    return null;
}


function change_est_date(date) {
    // Convert the date string to friendly format
    var date_arr = date.split('/'),
        date_rel = relative_date(date),
        date_val = null;

    if (date_arr.length > 1) {
        var mon = month[date_arr[0] - 1], 
            day = date_arr[1],
            year;

        if (date_arr.length > 2) {
            year = date_arr[2];
        } else {
            year = (new Date()).getFullYear();
        }

        date_val = mon + ' ' + day + ', ' + year;

    // Relative date: tomorrow
    } else if (date_rel !== null) {
        date_val = date_rel;
    }

    if (date_val !== null) {
        $('#pmtdate').val(date_val);
        AccountData.account.updateEstDate();
        return 1;
    }
    return 0;
}


function change_pay_amount(amount) {
    var payment = null;

    if (amount === 'current_balance') {
        payment = AccountData.account.get_current_balance();
    } else if (amount === 'minimum_due') {
        payment = AccountData.account.get_minimum_payment();
    } else if (amount.match(/^\d+(\.\d+)?$/)) {
        payment = amount;
    }

    if (payment !== null) {
        $('#pmtamount').val(CurrencyFormatted(payment));
        return 1;
    }

    return 0;
}


function payment_grammarHandler(result) {
    var interpretation = '',
        amount         = '',
        date           = '',
        destination    = '',
        source         = '',
        message        = null;

    NativeBridge.log('[MakeAPayment] ' + JSON.stringify(result));

    if (result == null || result.length == 0) {
        payment_setGrammar('What?');

    } else {
        interpretation = result[0].interpretation;

        switch (interpretation.SLOTS.action) {
        case 'back':
            $.mobile.changePage($('#main-menu'));
            break;

        case 'addsource':
            $.mobile.changePage($('#acct_add'));
            break;

        case 'submit':
            $.mobile.changePage($('#confirm'));
            break;

        case 'help':
            $.mobile.changePage($('#chat'));
            break;

        case 'pay':
            amount = interpretation.SLOTS.amount;
            source = interpretation.SLOTS.source;
            destination = interpretation.SLOTS.destination;
            date = interpretation.SLOTS.date;

            if (amount === 'none' && date === 'none' &&
                source === 'none' && destination === 'none') {
                $.mobile.changePage($('#confirm'));

            } else {
                if (date !== 'none' && change_est_date(date) === 0) {
                    message = "I'm sorry, I didn't get that date.";
                }

                if (source !== 'none') {
                    // set the new active source account
                    // and then refresh the list
                    AccountData.account.set_active_src_number(source);
                    AccountData.account.populate_src_acct_info();
                }

/*
                if (destination != 'none') {
                    //_active_cc_number = destination
                    // set the new active dest account
                    // and then refresh the list
                    AccountData.account.set_active_cc_number(destination);
                    AccountData.account.refresh_cc_dropdown('last-4-digits-payment');
                }
*/
                //handle the actual dollar amount last so it can overwrite any changes
                // made by the dropdown refreshes
                if (amount !== 'none' && change_pay_amount(amount) === 0) {
                    message = "I'm sorry, I didn't get that amount.";
                }
            }
            payment_setGrammar(message);
            break;

        case 'changesource':
            source = interpretation.SLOTS.source;
            if (source === 'none') {
                $.mobile.changePage($('#acct_from'));
            } else {
                AccountData.account.set_active_src_number(source);
                AccountData.account.populate_src_acct_info(); 
                //setAcctFrom(source);
                payment_setGrammar(null);
            }
            break;

/*
        case 'changedestination':
            switch (destination) {
            case 'platinum':
                setAcct(0, TO_TYPE);
                break;
            case 'gold':
                setAcct(1, TO_TYPE);
                break;
            case 'rewards':
                setAcct(2, TO_TYPE);
                break;
            }
*/
        case 'changedate':
            when = interpretation.SLOTS.date;
            if (when === "none" || change_est_date(when) === 0) {
                message = "I'm sorry, I didn't get that date.";
            }
            payment_setGrammar(message);
            break;

        case 'changeamount':
            amount = interpretation.SLOTS.amount;
            if (amount === 'none' || change_pay_amount(amount) === 0) {
                message = "I'm sorry, I didn't get that amount.";
            }
            payment_setGrammar(message);
            break;
        }
    }
}

//-----------------------------------------------------------------------------

var acctfrom_prompted = false;


function acctfrom_grammar() {
    return 'grammars/payment_src.grxml';
}


function acctfrom_setGrammar(message) {
    NativeBridge.setMessage(message);
    NativeBridge.setGrammar(acctfrom_grammar(), null, acctfrom_grammarHandler);
}


function acctfrom_beforeshow() {
    AccountData.account.initDropdown('last-4-digits-acctfrom', true);
    AccountData.account.initAcctSelect('list-acctfrom', false);
}


function acctfrom_show() {
    acctfrom_setGrammar(null);
    if (! acctfrom_prompted) {
        prompt('acctfrom');
        acctfrom_prompted = true;
    }
}


function acctfrom_beforehide() {
    NativeBridge.cancelAudio();
}


function acctfrom_grammarHandler(result) {
    var interpretation;

    NativeBridge.log('[AcctFrom] ' + JSON.stringify(result));

    if (result === null || result.length === 0) {
        acctfrom_setGrammar('What?');

    } else {
        interpretation = result[0].interpretation;

        switch (interpretation) {
        case 'help':
            $.mobile.changePage($('#chat'));
            break;

        case 'back':
            $.mobile.changePage($('#payment'));
            break;

        case 'add account':
            $.mobile.changePage($('#acct_add'));
            break;

        default:
            // set the new active source account
            // and then refresh the list
            setAcctFrom(interpretation);
            break;
       } 
    }
}

function setAcctFrom(number) {
    AccountData.account.set_active_src_number(number);
    $.mobile.changePage($('#payment'));
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------


var acctadd_prompted = false;
var acctadd_reco_errors = 0;

function acctadd_grammar() {
    return 'grammars/add_account.grxml';
}

function acctadd_setGrammar(message) {
    NativeBridge.setMessage(message);
    NativeBridge.setGrammar(acctadd_grammar(), null, acctadd_grammarHandler);
}

function acctadd_beforeshow() {
    NativeBridge.setMessage(null);
    AccountData.account.initDropdown('last-4-digits-acctadd', true);
/*
, function(dropdown, data) {
        // Callback sets up onchange handler for dropdown
        dropdown.on('change', function () {
            //  TO DO  Instead of updating transaction list, update the menu entries
        });

        // Initiate onchange event
        dropdown.change();
    });
*/
}


function acctadd_show() {
    acctadd_reco_errors = 0;
    acctadd_setGrammar(null);
    if (! acctadd_prompted) {
        prompt('acctadd');
        acctadd_prompted = true;
    }
}


function acctadd_beforehide() {
    NativeBridge.cancelAudio();
}


function acctadd_grammarHandler(result) {
    var interpretation = '',
        routing_number = '',
        account_number = '';

    NativeBridge.log('[AcctAdd] ' + JSON.stringify(result));

    if (result === null || result.length === 0) {
        acctadd_setGrammar('What?');

    } else {
        interpretation = result[0].interpretation;

        switch (interpretation.SLOTS.action) {
        case 'submit':
            add_new_account();
            break;

        case 'add':
            routing_number = interpretation.SLOTS.routenumber;
            account_number = interpretation.SLOTS.acctnumber;

            // TODO -  should be setting within Account obj 
            if (isNumber(routing_number)) {
                NativeBridge.log('[AcctAdd] add' +
                    ' routing number: "' + routing_number + '"'
                );
                $('#newacctrouting').val(routing_number);
            }

            if (isNumber(account_number)) {
                NativeBridge.log('[AcctAdd] add' +
                    ' account number: "' + account_number + '"'
                );
                $('#newacctnumber').val(account_number);
            }

            acctadd_setGrammar(null);
            break;

        case 'help':
            $.mobile.changePage($('#chat'));
            break;

        case 'back':
            $.mobile.changePage($('#payment'));
            break;

        default:
            NativeBridge.log('[AcctAdd] unknown action: "' +
                             interpretation.SLOTS.action + '"');
            acctadd_setGrammar('What?');
	    break;
        }
    }
}


function add_new_account() {
    switch (AccountData.account.addAcct()) {
    case 1:
        acctadd_setGrammar('Invalid routing number');
        break;
    case 2:
        acctadd_setGrammar('Invalid account number');
        break;
    default:
        $.mobile.changePage($("#payment"));
    }
}



//-----------------------------------------------------------------------------

function confirm_beforeshow() {
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(null, null, emptyGrammarHandler);

    AccountData.account.createConfirmationMsg();
    AccountData.account.initDropdown('last-4-digits-confirm', true);
/*
, function(dropdown, data) {
        // Callback sets up onchange handler for dropdown
        dropdown.on('change', function () {
        //  TO DO  Instead of updating transaction list, update the menu entries
        });

        // Initiate onchange event
        dropdown.change();
    });
*/
}


//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

var survey_reco_errors = 0;

function survey_beforeshow() {
  survey_reco_errors = 0;
  NativeBridge.setMessage(null);
  //NativeBridge.setGrammar("grammars/survey.grxml", null, survey_grammarHandler);
  NativeBridge.setGrammar(null, null, emptyGrammarHandler);

  AccountData.account.initDropdown('last-4-digits-dispute', true);
}


function survey_grammarHandler(result) {
  if (result != null && result.length > 0) {
    var interp = result[0].interpretation.toLowerCase();
    NativeBridge.log('survey_grammarHandler - reco result: ' + interp);

    if (interp == 'main menu') {
      survey_reco_errors = 0;
      $.mobile.changePage($('#main-menu'));

    } else if (interp == 'submit') {
      // just make it go to the main menu for now
      survey_reco_errors = 0;
      $.mobile.changePage($('#main-menu'));

    } else if (interp == 'chat') {
      survey_reco_errors = 0;
      $.mobile.changePage($('#chat'));

    } else {
      survey_reco_errors++;
      NativeBridge.log('survey_grammarHandler - unhandled:' + interp + '.');
    }
  } else {
    survey_reco_errors++;
    NativeBridge.log('survey_grammarHandler - no reco result.');
  }

  NativeBridge.log('survey_grammarHandler - survey_reco_errors: ' + survey_reco_errors);
  if (survey_reco_errors > 0) {
    NativeBridge.setGrammar('grammars/survey.grxml', null, survey_grammarHandler);
  }
}


function survey_onshow() {
  $('#survey-feedback').focus();
}


function survey_doStar(vid){
  if (vid == 0 && !$('li > span').hasClass('star-act')) {
    if ($('#s-'+vid).hasClass('star')) {
      $('#s-'+vid).removeClass('star').addClass('star-act');
    } else {
      $('#s-'+vid).removeClass('star-act').addClass('star');
    }
  } else {
    for (var i = vid; i < 5; i++) {
      if ($('#s-'+i).hasClass('star-act')) {
        $('#s-'+i).removeClass('star-act').addClass('star');
      }
    }
    for (var i = 0; i < 5; i++){
      $('#s-'+i).removeClass('star').addClass('star-act');
      if (i == vid) {
        break;
      }
    }
  }
}


function reset_rating() {
    $('.rating li span').removeClass('star-act').addClass('star');
    $('#survey-feedback').val('');
}

//-----------------------------------------------------------------------------

function chat_show() {
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(null, null, emptyGrammarHandler);
}

function main_menu_init() {
    $('#main-menu').on('pagebeforeshow', mainmenu_beforeshow);
    $('#main-menu').on('pageshow', mainmenu_show);
    $('#main-menu').on('pagebeforehide', mainmenu_beforehide);
    $('#make-a-payment-button').on('click', function () {
        $.mobile.changePage($('#payment'));
    });
}

function payments_init() {
    $('#payment').on('pagebeforeshow', payment_beforeshow);
    $('#payment').on('pageshow', payment_show);
    $('#payment').on('pagebeforehide', payment_beforehide);
    $('#back-to-main').on('click', function () {
        $.mobile.changePage($('#main-menu'));
    });
    $('#pmtdate, #pmtdate-a').on('click', function () {
        $('#pmtdatehidden').datebox('open');
    });
    $('#submit-payment').on('click', function () {
        $.mobile.changePage($('#confirm'));
    });
    // Uncomment to enable selection between
    // minimum payment and current balance.
/*
    $('#pmt-options').on('click', function () {
        $('#pmt-choice').selectmenu('open');
    });
*/
}

function acct_from_init() {
    $('#acct_from').on('pagebeforeshow', acctfrom_beforeshow);
    $('#acct_from').on('pageshow', acctfrom_show);
    $('#acct_from').on('pagebeforehide', acctfrom_beforehide);
    $('#back-to-payment').on('click', function () {
        $.mobile.changePage($('#payment'));
    });
}

function acct_add_init() {
    $('#acct_add').on('pagebeforeshow', acctadd_beforeshow);
    $('#acct_add').on('pageshow', acctadd_show);
    $('#acct_add').on('pagebeforehide', acctadd_beforehide);
    $('#back-to-acct-from').on('click', function () {
        $.mobile.changePage($('#acct_from'));
    });
    $('#newacctname,#newacctrouting,#newacctnumber').on('click', function () {
        NativeBridge.setMessage(null);
    });
    $('#add-acct-button').on('click', add_new_account);
}

function confirm_init() {
    $('#confirm').on('pagebeforeshow', confirm_beforeshow);
    $('#back-to-payment-confirm').on('click', function () {
        $.mobile.changePage($('#payment'));
    });
    $('#confirm-continue').on('click', function () {
        $.mobile.changePage($('#survey'));
    });
}

function survey_init() {
    $('#survey').on('pagebeforeshow', survey_beforeshow);
    $('#survey').on('pageshow', survey_onshow);
    $('#back-to-main-survey').on('click', function () {
        reset_rating();
        $.mobile.changePage($('#confirm'));
    });
    $('ul.rating li').on('click', function () {
        survey_doStar(this.firstChild.id.replace('s-', ''));
    });
}

function chat_init() {
    $('#chat').on('pageshow', chat_show);
}

function payments_demo_init() {
    //$('div[data-role=page]').live('mobileinit pageinit pagecontainercreate pagebeforechange pagechange pagechangefailed pagebeforecreate pagecreate create pagebeforeshow pageshow pagebeforehide pagehide', function (event, data) { print_event(event, data); });

    main_menu_init();
    payments_init();
    acct_from_init();
    acct_add_init();
    confirm_init();
    survey_init();
    chat_init();
}
