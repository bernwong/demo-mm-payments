#!/usr/local/bin/perl -w
# ------------------------------------------------------------------------------
# $Id$
# ------------------------------------------------------------------------------
# FILE: generate_client_files.pl
# AUTH: Nathan E. Fairchild
# DATE: May-29-2012
# ------------------------------------------------------------------------------

use strict;
use warnings;
use Carp;
use File::Basename;
use File::Find;

# ------------------------------------------------------------------------------
sub usage {
    my $msg  = shift;
    my $self = basename($0);

    print "\nERROR: $msg\n\n" if $msg;
    print <<"    EndUsage";
USAGE:

    $self -make <client_name> [config option pairs]

    $self -clean <client_name>


EXAMPLES:

    $self -make amex \\
        CLIENT_CAMEL_CASE=Amex \\
        BACKGROUND_COLOR= \\
        BACKGROUND_REPEAT= \\
        FONT_COLOR='#26759b' \\
        HEADING_FONT_COLOR='#26759b' \\
        HEADING_FONT_WEIGHT=normal \\
        LAST_CARD_DIGIT_PREFIX='-' \\
        LAST_NUM_CARD_DIGITS=5

    $self -make 'capone' \\
        CLIENT_CAMEL_CASE=CapOne \\
        BACKGROUND_COLOR='#013b70' \\
        BACKGROUND_REPEAT=no-repeat \\
        FONT_COLOR='#06467c' \\
        HEADING_FONT_COLOR='#ffffff' \\
        HEADING_FONT_WEIGHT=bold \\
        LAST_CARD_DIGIT_PREFIX='...' \\
        LAST_NUM_CARD_DIGITS=4

    EndUsage

    exit ($msg ? 1 : 0);
}

# ------------------------------------------------------------------------------
sub clean {
    my $client = shift;
    find( sub {
        m/-$client\.(css|html|js)/ && print("CLEAN: $_\n") && unlink($_); },
    '.' );
}

# ------------------------------------------------------------------------------
sub generate_file {
    my ($client, $config, $template) = @_;

    my $new_file = $template;
       $new_file =~ s/-template\./-$client./;

    # Read in and translate the template
    my @lines = ();
    open my $template_fh, '<', $template or die "Cannot open $template: $!";
    while (my $line = <$template_fh>) {
        foreach my $key (keys %$config) {
            $line =~ s/\$$key/$config->{$key}/g;
        }
        push @lines, $line;
    }
    close $template_fh or die "Cannot close $template: $!";

    # Write the new file
    open my $new_file_fh, '>', $new_file or die "Cannot open $new_file: $!";
    print $new_file_fh join('', @lines);
    close $new_file_fh or die "Cannot close $new_file: $!";
}
    
# ------------------------------------------------------------------------------
sub make {
    my $client = shift;
    my $config = shift;

    find( sub {
        m/-template\.(css|html|js)/ && generate_file($client, $config, $_);
    }, '.' );
}

# ------------------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------------------
my $action = shift or usage('please specify an action: -make or -clean');
my $client = shift or usage('please specify a client name: e.g. amex');

if ($action eq '-make') {
    my $config = {
        'CLIENT_NAME' => $client
    };
    foreach my $arg (@ARGV) {
        if ($arg =~ m/^([A-Z][A-Z_]+)=(.*)$/o) {
            $config->{$1} = $2;
        }
    }
    make($client, $config);
} elsif ($action eq '-clean') {
    if ($client) {
        if ($client ne 'template') {
            clean($client);
        } else {
            usage('"template" is not a valid argument for the -clean action');
        }
    } else {
        usage('the -clean action requires a client name argument');
    }
} else {
    usage("The action '$action' is unknown")
}
