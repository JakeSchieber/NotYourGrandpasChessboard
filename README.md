# NotYourGrandpasChessboard
Capstone 453 - Spring 2016 - NotYourGrandpasChessboard mobile and app and server repository

# Node WebService
Running on port: 8085

# Setting up the service.
https://www.npmjs.com/package/forever-service
npm install -g forever-service

Install a forever instance of your server as a service:
forever-service install nygcService --script server.js
forever-service delete nygcService

Commands to interact with service nygcService
Start   - "sudo service nygcService start"
Stop    - "sudo service nygcService stop"
Status  - "sudo service nygcService status"
Restart - "sudo service nygcService restart"
