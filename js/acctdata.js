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
        var extra  = $.inArray(acct_number, [selected, _active_src_number]) < 0 ?
                     '' : ' selected="selected"';
        var option = '<option value="' + acct_number + '"' + extra + 
                     '>' + acct_name + '</option>'; 
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
            listPaymentOptions("list-payment-amount", false);
        });
        // Call the change handler to update the active CC number
        dropdown.change();
        return dropdown;
    };



    var listAccts = function(div, disabled) {
        var div = $('#' + div);
        div.empty();
        
        var selected_src_number = AccountData.account.active_src_number();
        // Build the list
        var list = select_acct_element().appendTo(div);
        $(data.src_accounts).each( function(i, acct) {
            select_acct_option(acct.name, acct.number, selected_src_number).appendTo(list);
        });
        $('<option value="add">Add New Account</option>').appendTo(list);
        $('<option>Select Account</option>').appendTo(list);
        list.selectmenu();
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

    var listPaymentOptions = function(div, disabled) {
        var div = $('#' + div);
        div.empty();
        //get the current balance and minumum payment values
        var acct = dest_account();
        var curr_balance = acct.balance;
        var min_pmt = acct.minpmt;
        //Only continue if min_pmt has a value
        if (min_pmt == null) {
            // set the current balance and don't create a a select option
            $('#pmtoptlabel').html('CURRENT<br />BALANCE');
            $('#minimum-payment-value').html('$' + curr_balance);
            $('#pmtamount').val(curr_balance);
            return;
        }
        var seltext = '<select name="pmt-choice" id="pmt-choice"' +
                      ' data-native-menu="false"></select>'; 
        var list = $(seltext).appendTo(div);
        $('<option value="' + min_pmt + '">Minimum Payment: $' + min_pmt + '</option>').appendTo(list); 
        $('<option value="' + curr_balance + '">Current balance: $' + curr_balance + '</option>').appendTo(list);
        list.selectmenu();

        //now hide the list by setting the parent div to hide
        $('#list-payment-amount').hide(); 

        list.on('change', function() {
            var acct = dest_account();
            if (list[0].value == acct.balance) {
                $('#pmtoptlabel').html('CURRENT<br />BALANCE');
                $('#minimum-payment-value').html('$' + curr_balance);
                $('#pmtamount').val(curr_balance);
            }
            else {
                $('#pmtoptlabel').html('MINIMUM<br />PAYMENT');
                $('#minimum-payment-value').html('$' + min_pmt);
                $('#pmtamount').val(min_pmt);
            }
        });
        // Call the change handler to update the active src number
        list.change();
        return list;
    }


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
        var name = capitaliseFirstLetter(acct.name);
     //   $('#minimum-payment-value').html('$' + acct.balance);
        var duedate = $('#payment-due-value').html(date);
        //set the due date box in the datebox picker widget
        var datebox_date = AccountData.utils.date_due_datebox(acct.datedue);
        $('#pmtdatehidden').data('datebox').options.highDates = [datebox_date];
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
        var src_acct_balance =  src_acct.balance;
        //var summary = '<span>' + src_acct.name +  " number: " + src_acct_num_last4 + 
        //              " balance: " + src_acct_balance + "</span>";
        var summary = '<table width="100%" border="0">' +
                     '<tr><td class="pmtacctlabel">Payment Account</td>';
        // display balance only if available
        if (src_acct_balance != null) {
             summary += '<td class="availbalancelabel">Avail Balance</td>';
        }
        summary += '</tr><tr><td class="pmtacctdata">' + src_acct_name + '</td>';
        // display balance only if available
        if (src_acct_balance != null) { 
            summary += '<td class="availbalancedata">$' + src_acct_balance + '</td>';
        }
        summary += '</tr></table>';

        
        var div = $('#src-acct-info');
        div.empty();
        $(summary).appendTo(div);
    }

    var create_confirmation = function() {
        var confirm_num = 'TBW' +  Math.floor(Math.random()*100000001);
        var selected_cc_number = AccountData.account.active_cc_number();
        var cc_acct = dest_account();
        var pay_to_name = cc_acct.name;
        var pay_to_number = $('#card-choice').val();
        var pay_to_number_last4 = "x" + pay_to_number.substr(-4);
        var src_acct = src_account();
        var pay_from_name = src_acct.name;
        var pay_from_number = $('#acct-choice').val();
        var pay_from_number_last4 = "x" + pay_from_number.substr(-4);
        var pay_amt = $('#pmtamount').val();
        var pay_date = $('#pmtdate').val();
        var est_pay_date = $('#estdate').html();
        
        var confirm_msg = '<table width="100%" cellpadding="0" cellspacing="0">' + 
                          '<tr><td class="confirmlabel">CONFIRMATION #:  </td>' +
                          '<td class="confirmdata">' + confirm_num + '</td></tr>' +
                          '<tr><td class="confirmlabel">PAY TO:  </td>' +
                          '<td class="confirmdata">' + pay_to_name + " " + pay_to_number_last4 + '</td></tr>' +
                          '<tr><td class="confirmlabel">PAY FROM:  </td>' +
                          '<td class="confirmdata">' + pay_from_name + " " +  pay_from_number_last4 + '</td></tr>' +
                          '<tr><td class="confirmlabel">PAYMENT AMOUNT:&nbsp;&nbsp;</td>' +
                          '<td class="confirmdata">' +  pay_amt + '</td></tr>' +
                          '<tr><td class="confirmlabel">PAYMENT DATE:  </td>' +
                          '<td class="confirmdata">' +  pay_date + '</td></tr>' +
                          '<tr><td class="confirmlabel-noborder">EST POST DATE:  </td>' +
                          '<td class="confirmdata-noborder">' + est_pay_date + '</td></tr>' +
                          '</table>';
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
        populate_src_acct_info();
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
        initPmtOptsDropdown: function(div, disabled, callback) {
            var url = makeAccountUrl();
            if (data === null) {
                $.getJSON(url, function(results) {
                    data = results;
                    var list = listPaymentOptions(div, disabled);
                    if (typeof callback === 'function') {
                        callback(list, data);
                    }
                });
            } else {
                var list = listPaymentOptions(div, disabled);
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
        set_active_cc_number: function(newval) {
            _active_cc_number = newval;
        },
        active_cc_number: function() {
            return _active_cc_number;
        },
        refresh_cc_dropdown: function(div) {
            return listCards(div,false);
        },
        set_active_src_number: function(newval) {
            _active_src_number = newval;
        },
        active_src_number: function() {
            return _active_src_number;
        },
        refresh_src_dropdown: function (div) {
            return listAccts(div,false);
        },
        get_current_balance: function() {
            return dest_account().balance;
        },
        get_minimum_payment: function () {
            if (dest_account().minpmt  != null) {
                return dest_account().minpmt;
            } else {
                return 20;
            }
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
      monthval: date.getMonth() + 1,
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

  var date_due_datebox = function(datedue) {
      var tstamp = 0;
      if (datedue.match(/^-?\d+$/)) {
          tstamp = $.now() + (parseFloat(datedue) * 24 * 60 * 60 * 1000) * -1;
      } else {
          tstamp = Date.parse(datedue);
      }
      var obj = timestamp_to_object(tstamp);
      var monthval = obj.monthval;
      if (monthval < 10) {
          monthval = '0' + monthval;
      }
      var day = obj.day;
      if (day < 10) {
          day = '0' + day;
      }
      return obj.year+ '-' + monthval + '-' + day;
  };


  return {
    timestamp_to_object: timestamp_to_object,
    transaction_date: transaction_date,
    transaction_date_object: transaction_date_object,
    merchant_decode: merchant_decode,
    date_due: date_due,
    date_due_datebox: date_due_datebox
  };
})(jQuery);
