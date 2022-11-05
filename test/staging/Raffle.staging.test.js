/*
process to run  our staging test
1. get sub id for vrf contract
  a). this sub id will help us to get the random words. 
    for our lottery contract
   b). our contract will be consumer for that sub id
2.deploy our contract with the sub id
3.register contract with chainlink VRF and its sub id
4. register the contract with chainlink keeper
5.run staging test
*/

const { expect, assert } = require("chai");
const { network, getNamedAccounts, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle staging test", function () {
      let raffle, raffleInerval, deployer, raffleEntranceFee;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        raffle = await ethers.getContract("Raffle", deployer);
        raffleInerval = await raffle.getInterval();
        raffleEntranceFee = await raffle.getEntranceFee();
      });

      describe("fulfillRandomwords", () => {
        it("works with chainlink keeper, chainlink vrf", async () => {
          const startingTimestamp = await raffle.getLatestTimeStamp();
          const accounts = await ethers.getSigners();
          await new Promise(async (resolve, reject) => {
            raffle.once("winnerPicked", async () => {
              console.log("winner picked");

              try {
                const recentWinner = await raffle.getRecentWinner();

                const raffleState = await raffle.getRaffleState();
                const winnerEndingBalance = await accounts[0].getBalance();
                const endingTimeStamp = await raffle.getLatestTimeStamp();
                // now check players length is zero

                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(raffleEntranceFee).toString()
                );

                assert(endingTimeStamp > startingTimestamp);
                resolve();
              } catch (error) {
                console.log(error);
                reject(error);
              }
            });

            const tx = await raffle.enterRaffle({ value: raffleEntranceFee });

            await tx.wait(1);
            console.log("time to wait now");
            const winnerStartingBalance = await accounts[0].getBalance();

            console.log(winnerStartingBalance);
          });
        });
      });
    });
