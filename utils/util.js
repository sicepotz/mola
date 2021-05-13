const SolanaWeb3 = require('@solana/web3.js');
const Serum = require('@project-serum/serum');
const env = require('../env.json');
const moment = require("moment");
const Discord = require('discord.js');

class Util {
    static async getMarketPriceSerum(){
        try {
            let connection = new SolanaWeb3.Connection('https://api.mainnet-beta.solana.com');
            let marketAddress = new SolanaWeb3.PublicKey('HiyxvxXTf4VB1W7SiHcyysdskxTCfwmpeTqdJ8tettnD');
            let programId = new SolanaWeb3.PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin');
            let market = await Serum.Market.load(connection, marketAddress, {}, programId);
            
            // Fetching orderbooks
            let bids = await market.loadBids(connection);
            let asks = await market.loadAsks(connection);
            let trades = await market.loadFills(connection);
            let bb = bids.getL2(20).length > 0 && Number(bids.getL2(20)[0][0]);
            let ba = asks.getL2(20).length > 0 && Number(asks.getL2(20)[0][0]);
            let last = trades && trades.length > 0 && trades[0].price;
            let markPrice =
              bb && ba
                ? last
                  ? [bb, ba, last].sort((a, b) => a - b)[1]
                  : (bb + ba) / 2
                : null;
            return markPrice;
        } catch (error) {
            console.error( error );
        }
    }

    static async getConsultUserRedis( msg ) {
        let getConsult = await new Promise( ( resolve, reject ) => {
            return global.clientRedis.get('consult:'+msg.author.id, function(err, consult) {
              resolve(consult);
            });
        });
        if( getConsult == null ) {
            global.clientRedis.set('consult:'+msg.author.id, JSON.stringify({
                'user_id': msg.author.id,
                'last_msg': moment().utc().toDate(),
                'msg_count': 1,
            }));
            global.clientRedis.expire('consult:'+msg.author.id , env.SECONDCONSULT);
            return false;
        } else {
            getConsult = JSON.parse( getConsult );
            getConsult.msg_count += 1;
            if( getConsult.msg_count > parseInt( env.MAXCONSULT ) ) {
                const alertEmbed = new Discord.RichEmbed()
                    .setColor('#fffff0')
                    .setTitle(`Only one consult per user is allowed every ${env.MINCONSULT} minutes.`)
                msg.channel.send(alertEmbed);
                return true;
            }
            global.clientRedis.set('consult:'+msg.author.id, JSON.stringify(getConsult));
            global.clientRedis.expire('consult:'+msg.author.id , env.SECONDCONSULT);
            return false;
        }
    }
}
module.exports = Util;