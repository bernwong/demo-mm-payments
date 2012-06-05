all: amex capone

clean: clean_amex clean_capone

amex:
	bin/generate_client_files.pl -make amex \
	CLIENT_CAMEL_CASE=Amex \
	BACKGROUND_COLOR= \
	BACKGROUND_REPEAT= \
	FONT_COLOR='#26759b' \
	HEADING_FONT_COLOR='#26759b' \
	HEADING_FONT_WEIGHT=normal \
	LAST_NUM_CARD_DIGITS=5 \
	LAST_CARD_DIGITS_PREFIX='-'

clean_amex:
	bin/generate_client_files.pl -clean amex

capone:
	bin/generate_client_files.pl -make capone \
	CLIENT_CAMEL_CASE=CapOne \
	BACKGROUND_COLOR='#013b70' \
	BACKGROUND_REPEAT=no-repeat \
	FONT_COLOR='#0b335c' \
	HEADING_FONT_COLOR='#ffffff' \
	HEADING_FONT_WEIGHT=bold \
	LAST_NUM_CARD_DIGITS=4 \
	LAST_CARD_DIGITS_PREFIX='...'

clean_capone:
	bin/generate_client_files.pl -clean capone

ec2_deploy: all
	rsync -ravz -e "ssh -i $(HOME)/.ssh/fkg-p.pem -l ec2-user" . ec2-user@ec2-184-72-7-75.us-west-1.compute.amazonaws.com:/var/www/html/content/paydemo/
