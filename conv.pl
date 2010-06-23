#!/usr/bin/perl
# Usage: conv.pl travian|imperion

use strict;
use warnings;

use JavaScript::Minifier::XS qw(minify);

# timeline specific script argument parsing
my ($script) = @ARGV;
my $games = "travian|imperion";
$script =~ /^($games)$/ or die "Usage: conv.pl $games\n";
my $inputfile = "${script}_time_line.user.js";
my $outputfile = "${script}_script.user.js";

# parse *.user.js
open(my $user, "<", $inputfile) or die "Can't open input file '$inputfile'";
open(my $out, ">", $outputfile) or die "Can't open output file '$outputfile'";
my @requires;
my %removes = ();
while(<$user>) {
	/([\w-]+\.js)/;
	my $js = $1;
	if (/\@require/) {
		push(@requires, $js);
	} elsif (/\#require/) {
		print STDERR "Skipping inclusion of '$js'\n";
	} elsif (/^\s*var\s*(\w+)\s*=\s*(true|false)\s*;\s*$/) {
		my $key = $1;
		my $b = $2 =~ /true/;
		$removes{$key} = $b;
		if ($b) {print STDERR "Removing if-s around $key\n";}
		else {print STDERR "Stripping if-s with $key\n";}
	} else {
		print $out $_;
	}
}

# recursive regexes
my ($braces, $parens);
my $quotes=qr/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/;
$braces=qr/([^{}"']|(??{$quotes})|\{(??{$braces})\})*/;
$parens=qr/([^()"']|(??{$quotes})|\((??{$parens})\))*/;

# append minified and stripped requires.
while($_ = shift(@requires)) {
	print $out "\n// FILE $_\n";
	open (my $req, "<", $_) or die "Missing '$_'.";
	my @data = <$req>;
	close $req;

	my $d = "@data";
	
	# minify code
	$d = minify($d);
	
	# strip (un)used
	while ( my ($key, $keep) = each(%removes) ) {
        	if ($keep) {
			$d =~ s/if\($key\)\{($braces)\}/$1/g;
			$d =~ s/\($key\?($parens):$parens\)/$1/g;
        	} else {
			$d =~ s/if\($key\)\{$braces\}//g;
			$d =~ s/\($key\?$parens:($parens)\)/$1/g;
			
			# make sure stripping worked.
			if ($d =~ /$key/) {
				print STDERR "Found '$key' in '$_'\n";
			}
        	}
	}
	$d =~ s/^\s+\*/ */gm;

	# print stripped code
	print $out $d;
}

