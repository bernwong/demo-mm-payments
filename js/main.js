var gAcctNumber = 2;
var gDynamicGrammarRootUrl = location.href.replace("/content/", "/perl/") + "grammars/dynamicgram.pl";
var gMerchantDelim = "<DELIM>";

//-----------------------------------------------------------------------------

function getUrlVar(name) {
  var vars = [], hash;
  var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    if (hash[0] == name) {
      return hash[1];
    }
  }
  return null;
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

//-----------------------------------------------------------------------------

var mainmenu_prompted = false;
var mainmenu_reco_errors = 0;

function mainmenu_grammar() {
  return "grammars/mainmenu.grxml";
}

function mainmenu_beforeshow() {
  AccountData.account.init(gAcctNumber);
  AccountData.account.initDropdown('last-4-digits-main', false, function(dropdown, data) {
    // Callback sets up onchange handler for dropdown
    dropdown.on('change', function () {
    });

    // Initiate onchange event
    dropdown.change();
  });
}

function mainmenu_show() {
  mainmenu_reco_errors = 0;
  NativeBridge.setMessage("Would you like to make a payment?");
  NativeBridge.setGrammar(mainmenu_grammar(), null, mainmenu_grammarHandler);
  if (!mainmenu_prompted) {
    NativeBridge.playAudio("audio/RT_Menu_01.wav");
    mainmenu_prompted = true;
  }
}

function mainmenu_beforehide() {
  NativeBridge.cancelAudio();
}

function mainmenu_grammarHandler(result) {
    if (result == null || result.length == 0) {
        NativeBridge.playAudio("audio/sorry.wav");
        NativeBridge.setMessage("What?");
        NativeBridge.setGrammar(mainmenu_grammar(), null, mainmenu_grammarHandler);
    } else {
        var interpretation = result[0].interpretation;
        NativeBridge.setMessage(null);
        if (interpretation == 'payment') {
            $.mobile.changePage("#payment");
        }
    }
}



//-----------------------------------------------------------------------------

var payment_prompted = false;
var payment_reco_errors = 0;

function payment_grammar() {
  return "grammars/make_payment.grxml";
}

function payment_beforeshow() {
  NativeBridge.setMessage(null);
  AccountData.account.init(gAcctNumber);
 
  AccountData.account.initDropdown('last-4-digits-payment', false, function(dropdown, data) {
    // Callback sets up onchange handler for dropdown
    dropdown.on('change', function () {
 //       alert("test");
    });

    // Initiate onchange event
    dropdown.change();
  });

  AccountData.account.populate_src_acct_info(); 

  AccountData.account.initPmtOptsDropdown("list-payment-amount", false, function(list, data) {
      
  });
  $('#datebox').hide();

  $('#pmtdatehidden').bind('datebox', function(e,p) {
          if ( p.method === 'close' ) {
            if ($('#pmtdatehidden').val() != "") { 
              $('#pmtdate').val($('#pmtdatehidden').val());
              AccountData.account.updateEstDate();
            }
          }
          });
   
}

function payment_show() {
  payment_reco_errors = 0;
//  NativeBridge.setMessage(null);
  NativeBridge.setGrammar(payment_grammar(), null, payment_grammarHandler);
  if (!payment_prompted) {
//    NativeBridge.playAudio("audio/RT_Menu_01.wav");
    payment_prompted = true;
  }
}

function payment_beforehide() {
  NativeBridge.cancelAudio();
}

function payment_grammarHandler(result) {

    if (result == null || result.length == 0) {
        NativeBridge.playAudio("audio/sorry.wav");
        NativeBridge.setMessage("What?");
        //    NativeBridge.playTTS("male", "I'm sorry, could you repeat that?");
        NativeBridge.setGrammar(payment_grammar(), null, payment_grammarHandler);
    } else {
        NativeBridge.setMessage(null);
        NativeBridge.setGrammar(payment_grammar(), null, payment_grammarHandler);
        var interpretation = result[0].interpretation;
        var action = interpretation.SLOTS.action;
        var date1 = "";
        var amount = "";
        var source = "";
        var destination = "";

        if (action == 'pay') {
            amount = interpretation.SLOTS.amount;
            source = interpretation.SLOTS.source;
            destination = interpretation.SLOTS.destination;
            date1 = interpretation.SLOTS.date;

            if (amount == "none" && date == "none" && source == "none" && destination == "none") {
                $.mobile.changePage("#confirm");
            }
            else {
                if (date1 != "none") {
                    //convert the date string to friendly format
                    var datearr = date1.split('/');
                    // TODO still need to process relative date (i.e. tomorrow)
                    // skip for now
                    if (datearr.length > 1) {
                        var month1 = month[ datearr[0] - 1]; 
                        var dom1 =  datearr[1];
                        var year1;
                        if (datearr.length > 2) {
                            year1 = datearr[2];
                        }
                        else {
                            var currdate = new Date();
                            year1 = currdate.getFullYear();
                        }
                        $('#pmtdate').val(month1 + " " + dom1 + ", " + year1);
                        AccountData.account.updateEstDate();
                    }
                }
                if (source != "none") {
                    // set the new active source account
                    // and then refresh the list
                    AccountData.account.set_active_src_number(source);
                    AccountData.account.populate_src_acct_info();
                }
                if (destination != "none") {
                    //_active_cc_number = destination
                    // set the new active dest account
                    // and then refresh the list
                    AccountData.account.set_active_cc_number(destination);
                    AccountData.account.refresh_cc_dropdown('last-4-digits-payment');
                }
                //handle the actual dollar amount last so it can overwrite any changes
                // made by the dropdown refreshes
                amount = interpretation.SLOTS.amount;
                if (amount == "current_balance") {
                    amount = AccountData.account.get_current_balance();
                //   $('#pmtamount').val(AccountData.account.get_current_balance());
                }
                else if (amount == "minimum_due") {
                    amount = AccountData.account.get_minimum_payment();
                //    $('#pmtamount').val(AccountData.account.get_minimum_payment());
                }
                else {
//                    $('#pmtamount').val(amount);
                }
                $('#pmtamount').val(CurrencyFormatted(amount));
                
            }
        }

        else if (action == 'changesource') {
            $.mobile.changePage("#acct_from");
        }
/*
        else if (action == 'changedestination') {
            if (destination == 'platinum') {
                setAcct(0, TO_TYPE);
            } else if (destination == 'gold') {
                setAcct(1, TO_TYPE);
            } else if (destination == 'rewards') {
                setAcct(2, TO_TYPE);
            }
        }
*/
        else if (action == 'addsource') {
            $.mobile.changePage("#acct_add");
        }
        else if (action == 'help') {
            $.mobile.changePage("#chat");
        }
        else if (action == 'back') {
            $.mobile.changePage("#main-menu");
        }
    }
}

//-----------------------------------------------------------------------------

var acctfrom_prompted = false;
var acctfrom_reco_errors = 0;

function acctfrom_grammar() {
    return "grammars/payment_src.grxml";
}

function acctfrom_beforeshow() {
    NativeBridge.setMessage(null);
    AccountData.account.initDropdown('last-4-digits-acctfrom', true, function(dropdown, data) {
        // Callback sets up onchange handler for dropdown
        dropdown.on('change', function () {
        //  TO DO  Instead of updating transaction list, update the menu entries
        });
        // Initiate onchange event
        dropdown.change();
    });
    AccountData.account.initAcctSelect('list-acctfrom', false, function(list, data) {
          //        alert("test");
    });
}

function acctfrom_show() {
  acctfrom_reco_errors = 0;
  NativeBridge.setGrammar(acctfrom_grammar(), null, acctfrom_grammarHandler);
  if (!acctfrom_prompted) {
//    NativeBridge.playAudio("audio/RT_Menu_01.wav");
    acctfrom_prompted = true;
  }
}

function acctfrom_beforehide() {
  NativeBridge.cancelAudio();
}

function acctfrom_grammarHandler(result) {

    if (result == null || result.length == 0) {
        NativeBridge.playAudio("audio/sorry.wav");
        NativeBridge.setMessage("What?");
        NativeBridge.setGrammar(acctfrom_grammar(), null, acctfrom_grammarHandler);
    } else {
        NativeBridge.setMessage(null);
        NativeBridge.setGrammar(acctfrom_grammar(), null, acctfrom_grammarHandler);

        var interpretation = result[0].interpretation;

        if (interpretation == 'help') {
            $.mobile.changePage("#chat");
        }
        else if (interpretation == 'back') {
            $.mobile.changePage("#payment");
        }
        else if (interpretation == 'add') {
            $.mobile.changePage("#acct_add");
        }
        else {
            // set the new active source account
            // and then refresh the list
            setAcctFrom(interpretation);
       } 
    }
}

function setAcctFrom(number) {
    AccountData.account.set_active_src_number(number);
    $.mobile.changePage("#payment");
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------


var acctadd_prompted = false;
var acctadd_reco_errors = 0;

function acctadd_grammar() {
    return "grammars/add_account.grxml";
}

function acctadd_beforeshow() {
    NativeBridge.setMessage(null);
    AccountData.account.initDropdown('last-4-digits-acctadd', true, function(dropdown, data) {
            // Callback sets up onchange handler for dropdown
            dropdown.on('change', function () {
                //  TO DO  Instead of updating transaction list, update the menu entries
                });

            // Initiate onchange event
            dropdown.change();
            });
}

function acctadd_show() {
  acctadd_reco_errors = 0;
  NativeBridge.setGrammar(acctadd_grammar(), null, acctadd_grammarHandler);
  if (!acctadd_prompted) {
//    NativeBridge.playAudio("audio/RT_Menu_01.wav");
    acctadd_prompted = true;
  }
}

function acctadd_beforehide() {
  NativeBridge.cancelAudio();
}

function acctadd_grammarHandler(result) {
    if (result == null || result.length == 0) {
        NativeBridge.playAudio("audio/sorry.wav");
        NativeBridge.setMessage("What?");
        NativeBridge.setGrammar(acctadd_grammar(), null, acctadd_grammarHandler);
    } else {
        NativeBridge.setMessage(null);
        var interpretation = result[0].interpretation;
        var action = interpretation.SLOTS.action;
        var routenumber = "";
        var acctnumber = "";
        if (action == 'submit') {
            add_acct();
        } else if (action == "add") {
            routenumber = interpretation.SLOTS.routenumber;
            acctnumber = interpretation.SLOTS.acctnumber;
            // TODO -  should be setting within Account obj 
            if (isNumber(routenumber)) {
                $("#newacctrouting").val(routenumber);
            }
            if (isNumber(acctnumber)) {
                $("#newacctnumber").val(acctnumber);
            }
            NativeBridge.setGrammar("grammars/add_account.grxml", null, acctadd_grammarHandler);
        }
        else if (action == 'help') {
            $.mobile.changePage("#chat");
        }
        else if (action == 'back') {
            $.mobile.changePage("#payment");
        }
    }
}

function add_acct() {
    var result = AccountData.account.addAcct();
    if (result == 1) {
        NativeBridge.setGrammar("grammars/add_account.grxml", null, acctadd_grammarHandler);
        NativeBridge.setMessage("Invalid routing number");
    } 
    else if (result == 2) {
        NativeBridge.setGrammar("grammars/add_account.grxml", null, acctadd_grammarHandler);
        NativeBridge.setMessage("Invalid account number");
    }
    else {
        $.mobile.changePage($("#payment"));
    }
}



//-----------------------------------------------------------------------------

function confirm_beforeshow() {
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(null, null, emptyGrammarHandler);

    AccountData.account.createConfirmationMsg();
    AccountData.account.initDropdown('last-4-digits-confirm', true, function(dropdown, data) {
            // Callback sets up onchange handler for dropdown
            dropdown.on('change', function () {
                //  TO DO  Instead of updating transaction list, update the menu entries
                });

            // Initiate onchange event
            dropdown.change();
            });
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

  AccountData.account.init(gAcctNumber);
  AccountData.account.initDropdown('last-4-digits-dispute', true);
}

function survey_grammarHandler(result) {
  if (result != null && result.length > 0) {
    var interp = result[0].interpretation.toLowerCase();
    NativeBridge.log("survey_grammarHandler - reco result: " + interp);

    if (interp == "main menu") {
      survey_reco_errors = 0;
      $.mobile.changePage($("#main-menu"));

    } else if (interp == "submit") {
      // just make it go to the main menu for now
      survey_reco_errors = 0;
      $.mobile.changePage($("#main-menu"));

    } else if (interp == "chat") {
      survey_reco_errors = 0;
      $.mobile.changePage($("#chat"));

    } else {
      survey_reco_errors++;
      NativeBridge.log("survey_grammarHandler - unhandled:" + interp + ".");
    }
  } else {
    survey_reco_errors++;
    NativeBridge.log("survey_grammarHandler - no reco result.");
  }

  NativeBridge.log("survey_grammarHandler - survey_reco_errors: " + survey_reco_errors);
  if (survey_reco_errors > 0) {
    NativeBridge.setGrammar("grammars/survey.grxml", null, survey_grammarHandler);
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

//-----------------------------------------------------------------------------

function chat_show() {
  NativeBridge.setMessage(null);
  NativeBridge.setGrammar(null, null, emptyGrammarHandler);
}
