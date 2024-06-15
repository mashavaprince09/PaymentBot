

import { AuthenticatedClient, Grant, PendingGrant, Quote, WalletAddress, createAuthenticatedClient,isFinalizedGrant,isPendingGrant,} from "@interledger/open-payments";

import { randomUUID } from "crypto";
import * as net from 'net';




  export async function getAuthenticatedClient() {
    
  
    const client = await createAuthenticatedClient({
      walletAddressUrl: "https://ilp.rafiki.money/ffc52473",
      privateKey: "./private-2.key",
      keyId:"bde57813-19cb-437f-9e51-731aa9ebf333",
      validateResponses: false
    });
    return client;
  }
  

async function getWalletAddressInfo(client: AuthenticatedClient,
    walletAddress: string,): Promise<WalletAddress | null> {
        if (walletAddress.startsWith("$")){
            walletAddress = walletAddress.replace("$", "https://");}
        
          const walletAddressDetails = await client.walletAddress.get({
            url: walletAddress,
          });
        
          return walletAddressDetails;
    
  }

  export async function createIncomingPayment(
    client: AuthenticatedClient,
    value: string,
    walletAddressDetails: WalletAddress,
  ) {
    console.log("** creating incoming payment grant req");
    console.log(walletAddressDetails);
  
    // Request IP grant
    const grant = await client.grant.request(
      {
        url: walletAddressDetails.authServer,
      },
      {
        access_token: {
          access: [
            {
              type: "incoming-payment",
              actions: ["read", "create", "complete"],
            },
          ],
        },
      },
    );
  
    if (isPendingGrant(grant)) {
      throw new Error("Expected non-interactive grant");
    }
  
    // create incoming payment
    const incomingPayment = await client.incomingPayment.create(
      {
        url: new URL(walletAddressDetails.id).origin,
        accessToken: grant.access_token.value,
      },
      {
        walletAddress: walletAddressDetails.id,
        incomingAmount: {
          value: value,
          assetCode: walletAddressDetails.assetCode,
          assetScale: walletAddressDetails.assetScale,
        },
        // expiresAt: new Date(Date.now() + 60_000 * 10).toISOString(),
      },
    );
  
    console.log("** inc");
    console.log(incomingPayment);
    return incomingPayment;
  }

  export async function createQuote(
    client: AuthenticatedClient,
    incomingPaymentUrl: string,
    walletAddressDetails: WalletAddress,
  ) {
    console.log("** 2 req");
    console.log(walletAddressDetails);
  
    // Request Qoute grant
    const grant = await client.grant.request(
      {
        url: walletAddressDetails.authServer,
      },
      {
        access_token: {
          access: [
            {
              type: "quote",
              actions: ["create", "read", "read-all"],
            },
          ],
        },
      },
    );
  
    if (isPendingGrant(grant)) {
      throw new Error("Expected non-interactive grant");
    }
  
    // create qoute
    const qoute = await client.quote.create(
      {
        url: walletAddressDetails.resourceServer,
        accessToken: grant.access_token.value,
      },
      {
        method: "ilp",
        walletAddress: walletAddressDetails.id,
        receiver: incomingPaymentUrl,
      },
    );
  
    console.log("** qoute");
    console.log(qoute);
    return qoute;
  }

  export async function getOutgoingPaymentAuthorization(
  client: AuthenticatedClient,
 
  walletAddressDetails: WalletAddress,
): Promise<PendingGrant> {
    
        const grant = await client.grant.request(
            {
              url:walletAddressDetails.authServer,
            },
            {
              access_token: {
                access: [
                  {
                    identifier: walletAddressDetails.id,
                    type: "outgoing-payment",
                    actions: ["list", "list-all", "read", "read-all", "create"],
                    limits: {
                      
                    },
                  },
                ],
              },
              interact: {
                start: ["redirect"],
                
              },
            },
          );
          
          if (!isPendingGrant(grant)) {
            throw new Error("Expected interactive grant");
          }
          


  
  return grant;
}


export async function createOutgoingPayment(client: AuthenticatedClient,walletAddressUrl:WalletAddress,grant:PendingGrant,qoute:Quote){
  
    let grant2;
    while(true){
      console.log("trying to get payment.......");
      
       grant2 = await client.grant.continue(
        {
          accessToken: grant.continue.access_token.value,
          url: grant.continue.uri,
        },
        
      );

      console.log(grant2);
      if (isFinalizedGrant(grant2)){
        // sleep
        
        break;
      
      }
      else{
        console.log("sleeping....");
        await new Promise((r)=>setTimeout(r,2000));
        
      }
      
       
      
      
    }
    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: walletAddressUrl.resourceServer,
        accessToken: grant2.access_token.value, //OUTGOING_PAYMENT_ACCESS_TOKEN,
      },
      {
        walletAddress: walletAddressUrl.id,
        quoteId: qoute.id, //QUOTE_URL,
      },
    );
    return outgoingPayment;



}


 



// Create a TCP server
const server = net.createServer((socket: net.Socket) => {
  
    console.log('Client connected');

    // Handle incoming data from clients
    socket.on('data', async (data: Buffer) => {
      const myClient= await getAuthenticatedClient();
        console.log(`Received from client: ${data.toString()}`);
        const args=data.toString().split(" ");
        const sendWallet=args[0];
        const receiverWallet=args[1];
        const amountMoney=args[2];
        //get sender wallet address details
        const senderWalletsDetails=await getWalletAddressInfo( myClient,sendWallet);

        //get receiver wallet address details
        const receiverWalletsDetails=await getWalletAddressInfo(myClient,receiverWallet);
        if(!receiverWalletsDetails){
          throw new Error();
        }

        const incomingPayment=await createIncomingPayment(myClient,amountMoney,receiverWalletsDetails);
        console.log(incomingPayment);
        if(!senderWalletsDetails){ 
          throw new Error();
        }

        const myQuote=await createQuote(myClient,incomingPayment.id,senderWalletsDetails);

        //get outgoing payment
        const outPayment=await getOutgoingPaymentAuthorization(myClient,senderWalletsDetails);
        if(!isPendingGrant(outPayment)){
          throw new Error();
        }




        // Echo back to the client
        socket.write(`Server received: ${outPayment.interact.redirect}`);
        const completePayment= await createOutgoingPayment(myClient,senderWalletsDetails,outPayment,myQuote)
    });

    // Handle client disconnection
    socket.on('end', () => {
        console.log('Client disconnected');
    });
});

// Listen for connections on port 3000
server.listen(3003, () => {
    console.log('Server is listening on port 3002');
 });

