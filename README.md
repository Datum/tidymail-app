Tidy Mail App
=======

A free and open source tool to help you unsubscribe and delete newsletters and other spam. The easiest way to clean up your email inbox. Try at https://tidymail.io

Existing websites that offer newsletter unsubscribe services are horrible privacy invasions as they grant the operators full access to a users email inbox, we don't think that is acceptable and hence created Tidy Mail. 

Tidy Mail puts privacy first and therefore all code that accesses a users email inbox runs exclusively on the users browser side and the users email access credentials are not shared with anyone. 

## Features
- Access IMAP email inboxes completely from browser, users privacy is maintained as emails are not read from a server side
- Search inbox for newsletters
- Bulk unsubscribe of newsletters
- Bulk delete of newsletters (newsletters moved to trash)
- Show summary statistics about newsletters in inbox

## Development
- run `npm install -g @angular/cli`
- run `npm install`
- run `ng serve`

## Build
- run `ng build --prod --base-href /app/`

## License

Code released under [the AGPL license](https://github.com/Datum/tidymail-app/blob/master/LICENSE).

Copyright 2019 Datum Network GmbH. Tidy Mail is a trademark maintained by Datum Network GmbH.
