var AccountData = AccountData || {};

// Use this BaseUrl attribute to change the global location of the data
AccountData.BaseUrl = 'data/acctdata';

/*
 * Account Data Loader
 *
 * Loads mock account information.
 *
 *   AccountData.account.initDropdown(account_number);
 *   var account_data = AccountData.account.getData();
 *
 * account_data.fullname      => string
 * account_data.org           => string
 * account_data.emailaddrs    => array of hash {type, value, pref}
 * account_data.telephones    => array of hash {type, value, pref}
 * account_data.addresses     => array of hash {type, value, format}
 * account_data.urls          => array of hash {type, value}
 * account_data.src_accounts  => array of hash {name, routing, number}
 * account_data.dest_accounts => array of hash {name, number, balance, duedate}
 *
 */
AccountData.account = (function($) {
    var data = null;
    var _active_acct_number = null;
    var _active_cc_number = null;
    var _active_src_number = null;

    var mc_img = '<img src="img/mastercard.png" height="28px" style="padding-top: 2px;"/>';


    var makeAccountUrl = function() {
        return AccountData.BaseUrl + '/' + _active_acct_number + '.json';
    };


    var select_element = function(selected, disabled) {
        var opt = disabled ? ' disabled="disabled"' : '';
        return $('<select name="card-choice" id="card-choice"' +
                 ' data-mini="true"' + opt + '></select>');
    };


    var select_option = function(cc_number, selected) {
        var last_4 = cc_number.substr(-4);
        var extra  = $.inArray(cc_number, [selected, _active_cc_number]) < 0 ?
                     '' : ' selected="selected"';
        var option = '<option value="' + cc_number + '"' + extra +
                     '>...' + last_4 + '</option>';
        return $(option);
    };


     
    var select_acct_element = function() {
        return $('<select name="acct-choice" id="acct-choice"' +
                 ' data-native-menu="false" data-corners="false"></select>');
    };

    var select_acct_option = function(acct_name, acct_number, selected) {
        //var extra  = $.inArray(cc_number, [selected, _active_cc_number]) < 0 ?
        //             '' : ' selected="selected"';
        var option = '<option value="' + acct_number + '"><div>' + acct_name + " " + '</div></option>'; 
            return $(option);
    };



    var listCards = function(div, disabled) {
        var div = $('#' + div);
        div.empty();
        var selected_cc_number = AccountData.account.active_cc_number();

        // Add the CC icon
        $(mc_img).appendTo(div);
        // Build the CC dropdown list
        var dropdown = select_element(selected_cc_number, disabled).appendTo(div);
        $(data.dest_accounts).each( function(i, acct) {
            select_option(acct.number, selected_cc_number).appendTo(dropdown);
        });
        dropdown.selectmenu();

        // Setup the default change handler to record active CC number
        dropdown.on('change', function() {
            _active_cc_number = dropdown[0].value;
            populate_payment_due();
        });
        // Call the change handler to update the active CC number
        dropdown.change();
        return dropdown;
    };



    var listAccts = function(div, disabled) {
        var div = $('#' + div);
        div.empty();

        //var selected_cc_number = AccountData.account.active_cc_number();
        // Build the list
        var list = select_acct_element().appendTo(div);
        $(data.src_accounts).each( function(i, acct) {
            select_acct_option(acct.name, acct.number).appendTo(list);
        });
        $('<option value="add">Add New Account</option>').appendTo(list);
        $('<option>Select Account</option>').appendTo(list);
        list.selectmenu();
        _active_src_number = list[0].value;
        //now hide the list by setting the parent div to hide
        //  This allows us to create another area to display more information 
        //  about the selection
        $('#list-acctfrom').hide();

        // Setup the default change handler to record active src number
        list.on('change', function() {
            if (list[0].value == "add") {
                $.mobile.changePage($("#acct_add"));             
            } else {
                _active_src_number = list[0].value;
                populate_src_acct_info();
            }
        });
        // Call the change handler to update the active src number
        list.change();
        return list; 
    };

    var src_account = function() {
        return $.grep(data.src_accounts, function(acct) {
            return acct.number === _active_src_number;
        })[0];
    };


    var dest_account = function() {
        return $.grep(data.dest_accounts, function(acct) {
            return acct.number === _active_cc_number;
        })[0];
    };

    var populate_payment_due = function() {
        var acct = dest_account();
        var date = AccountData.utils.date_due(acct.datedue);
        var name = acct.name;
        $('#minimum-payment-value').html('$' + acct.balance);
        $('#minimum-payment-value-acctfrom').html('$' + acct.balance);
        var duedate = $('#payment-due-value').html(date);
        $('#payment-due-value-acctfrom').html(date);
        $('#acctname').html(name);
        $('#acctname1').html(name);
        $('#acctname-acctadd').html(name);
        $('#acctname-confirm').html(name);
        set_payment_amount();
        return acct;
    };

    var update_est_date = function() {
        // get the pmt date and add 1 day to it
        //                    alert($('#pmtdate').val());
        var date = new Date($('#pmtdate').val());
        date.addDays(1);
        month_name = month[date.getMonth()];
        year = date.getFullYear();
        day = date.getDate();
        $('#estdate').html( month_name + ' ' + day + ', ' + year );
    }
    
    var populate_src_acct_info = function() {
        var src_acct = src_account();
        var src_acct_name = src_acct.name;
        var src_acct_num = src_acct.number;
        var src_acct_num_last4 = src_acct_num.substr(-4);
        var src_acct_balance = src_acct.balance;
        var summary = '<span>' + src_acct.name +  " number: " + src_acct_num_last4 + 
                      " balance: " + src_acct_balance + "</span>";
        var div = $('#src-acct-info');
        div.empty();
        $(summary).appendTo(div);
    }

    var create_confirmation = function() {
        var confirm_num = 'TBW' +  Math.floor(Math.random()*100000001);
        var selected_cc_number = AccountData.account.active_cc_number();
        var pay_to_name = "payto";
        var pay_to_number = $('#card-choice').val();
        var pay_to_number_last4 = pay_to_number.substr(-4);
        var pay_from_name = "payfrom";
        var pay_from_number = $('#acct-choice').val();
        var pay_from_number_last4 = pay_from_number.substr(-4);
        var pay_amt = $('#pmtamount').val();
        var pay_date = $('#pmtdate').val();
        var est_pay_date = $('#estdate').html();
        
        var confirm_msg = "CONFIRMATION #:" + confirm_num +
                          "PAY TO:" + pay_to_name + " " + pay_to_number_last4 +
                          "PAY FROM:" + pay_from_name + " " +  pay_from_number_last4 +
                          "PAYMENT AMOUNT:" + pay_amt +
                          "PAYMENT DATE: " + pay_date +
                          "EST POST DATE: " + est_pay_date; 
        $('#txt_confirm').html(confirm_msg); 
    
    }

    var set_payment_amount = function() {
        var acct = dest_account();
        // Right now sets to minimum balance if a value is set in the json  
        // Otherwise sets to the current balance
        var minpmt = acct.minpmt;
        if (minpmt != null) {
            $('#pmtamount').val(minpmt);
        } 
        else {
            var balance = acct.balance;
            $('#pmtamount').val(balance);
        }
    }

    var add_src_acct =  function() {
        var cItems = data.src_accounts;
        var numItems = cItems.length;
        var acctname = $('#newacctname').val();
        var acctrouting = $('#newacctrouting').val();
        var acctnum = $('#newacctnumber').val();
        //check if routing number is valid
        if (!(isNumber(acctrouting) && acctrouting.length == 9)) {
      //      alert("invalid routing");
            return 1;
        }
        // check account number
        if (!(isNumber(acctnum) && acctnum.length == 10)) {
      //      alert("invalid acct");
            return 2;
        }
        cItems[numItems] = {"name": acctname, "routing": acctrouting, "number": acctnum};
        _active_src_number = acctnum; 
        return 0; 
    }

    // API bits
    return {
        init: function(acct_number) {
            _active_acct_number = acct_number;
        },
        initDropdown: function(div, disabled, callback) {
            var url = makeAccountUrl();
            if (data === null) {
                $.getJSON(url, function(results) {
                    data = results;
                    var dropdown = listCards(div, disabled);
                    if (typeof callback === 'function') {
                        callback(dropdown, data);
                    }
                });
            } else {
                var dropdown = listCards(div, disabled);
                if (typeof callback === 'function') {
                    callback(dropdown, data);
                }
            }
        },
        initAcctDropdown: function(div, disabled, callback) {
            var url = makeAccountUrl();
            if (data === null) {
                $.getJSON(url, function(results) {
                    data = results;
                    var list = listAccts(div, disabled);
                    if (typeof callback === 'function') {
                        callback(list, data);
                    }
                });
            } else {
                var list = listAccts(div, disabled);
                if (typeof callback === 'function') {
                    callback(list, data);
                }
            } 
        },
        setDefaultPaymentDates: function() {
                            var date = new Date();
                            var month_name = month[date.getMonth()];
                            var year = date.getFullYear();
                            var day = date.getDate();
                            $('#pmtdate').val( month_name + ' ' + day + ', '+ year);
                            update_est_date();
        },
        setDefaultPayment:  set_payment_amount,
        addAcct: add_src_acct,
        updateEstDate: update_est_date,
        createConfirmationMsg: create_confirmation,
        getData: function() {
            return data;
        },
        active_acct_number: function() {
            return _active_acct_number;
        },
        active_cc_number: function() {
            return _active_cc_number;
        },
        populate_payment_due: populate_payment_due
    };
})(jQuery);


// ----------------------------------------------------------------------------
// Module: AccountData.utils
//
// AccountData.utils.timestamp_to_object(millis)
// AccountData.utils.transaction_date(transaction)
// AccountData.utils.transaction_date_object(transaction)
//
AccountData.utils = (function($) {
  var dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Return printable 2 digit time value for hours, minutes and seconds
  var two_digit_string = function(num) {
    return (num < 10) ? '0' + num : '' + num;
  };

  // Convert milliseconds into displayable date attributes
  //
  //  var millis = $.now();
  //  var dt_obj = AccountData.utils.timestamp_to_object(millis);
  //
  // @param timestamp - integer, time in millis
  // @return object - day, dow, month, year attributes
  //
  var timestamp_to_object = function(timestamp) {
    var date = new Date(timestamp);
    var hour = two_digit_string(date.getHours());
    var mins = two_digit_string(date.getMinutes());
    var secs = two_digit_string(date.getSeconds());
    var time = [hour, mins, secs].join(':');
    return {
      day:     date.getDate(),
      dow:     dows[date.getDay()],
      month:   mons[date.getMonth()],
      year:    date.getYear() + 1900,
      hhmmss:  time,
      hours:   hour,
      minutes: mins,
      seconds: secs
    };
  };

  // Convert 'daysago' or [dow, month, day, year, time, zone] into a
  // timestamp (in milliseconds). Returns -1 if timestamp cannot be
  // created.  Updates transaction object with 'timestamp' attribute.
  //
  // @param transaction - a transaction object from JSON
  // @return timestamp in milliseconds
  //
  var transaction_date = function(transaction) {
    var day_millis = 24 * 60 * 60 * 1000;
    if (transaction['timestamp'] !== undefined) {
      return transaction.timestamp;
    }
    if (transaction['daysago'] !== undefined) {
      var now = new Date();
      var hrs = transaction.time.match(/\d+/g).map(function(a) {return a - 0});
      now.setHours(hrs[0], hrs[1]);
      var xtm = new Date(now.getTime() - transaction.daysago * day_millis);
      transaction.timestamp = xtm.getTime();
      return transaction.timestamp;
    }
    if (transaction['dow'] !== undefined) {
      transaction.timestamp = Date.parse(
        transaction.dow + ' ' +
        transaction.month + ' ' +
        transaction.day + ' ' +
        transaction.year + ' ' +
        transaction.time + ' ' +
        transaction.zone);
      return transaction.timestamp;
    }
    return -1; // Error in transaction object
  };

  var merchant_decode = function(value) {
    return $('<div/>').html(value).text();
  }

  // Return a date object for the given transaction
  //
  // @param transaction - a transaction object from JSON
  // @return object - day, dow, month, year attributes
  //
  var transaction_date_object = function(transaction) {
    return timestamp_to_object(transaction_date(transaction));
  };

  var date_due = function(datedue) {
      var tstamp = 0;
      if (datedue.match(/^-?\d+$/)) {
          tstamp = $.now() + (parseFloat(datedue) * 24 * 60 * 60 * 1000) * -1;
      } else {
          tstamp = Date.parse(datedue);
      }
      var obj = timestamp_to_object(tstamp);
      return obj.month + ' ' + obj.day + ', ' + obj.year;
  };

  return {
    timestamp_to_object: timestamp_to_object,
    transaction_date: transaction_date,
    transaction_date_object: transaction_date_object,
    merchant_decode: merchant_decode,
    date_due: date_due
  };
})(jQuery);
