const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle unit test", function () {
      const chainId = network.config.chainId;
      let raffle,
        raffleEntranceFee,
        deployer,
        raffleInterval,
        vrfCoordinatorV2Mock,
        accounts;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]); // deploying contracts that are mentioned as tag all in deploy folder's files
        raffle = await ethers.getContract("Raffle", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        ); // get deployed contract with help deployer

        raffleEntranceFee = await raffle.getEntranceFee();
        raffleInterval = await raffle.getInterval();
      });

      describe("Constructor", function () {
        it("intialize the raffle correctly", async function () {
          const raffleState = await raffle.getRaffleState(); // it will return in to 0 and 1 which is true false by definition but these are uint 256

          // need to convert into the string

          assert.equal(raffleState.toString(), "0"); // testing raffle state is equal to 0 or not

          assert.equal(
            raffleInterval.toString(),
            networkConfig[chainId]["interval"]
          );
        });
      });

      describe("enterRaffle", function () {
        it("check sufficient amount", async function () {
          expect(raffle.enterRaffle()).to.be.revertedWith(
            "Raffle_NotEnoughEthEntered"
          );
        });

        it("record player when they enter", async function () {
          raffleEntranceFee = await raffle.getEntranceFee();
          await raffle.enterRaffle({ value: raffleEntranceFee });

          // now check if our players are being added or not
          const playerFromContract = await raffle.getPlayer(0); // getting player from 0th index
          assert.equal(playerFromContract, deployer); // as deployer and raffle enterer are same
        });

        // now check the event
        it("check event after enter", async function () {
          await expect(
            await raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.emit(raffle, "RaffleEnter");
        });

        it("does not allow to participate when raffle calculating winner", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee }); // first try to enter in raffle process
          await network.provider.send("evm_increaseTime", [
            raffleInterval.toNumber() + 1,
          ]); // increasing time manually

          await network.provider.send("evm_mine", []); // mine the block
          await raffle.performUpkeep([]); // now call performUpkeep function to set raffle state into calulcating mode

          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.be.revertedWith("Raffle_NotOpen");
        });
      });

      describe("checkUpkeep", function () {
        it("return false if people have not sent any eth", async function () {
          await network.provider.send("evm_increaseTime", [
            raffleInterval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upKeepNeeded } = await raffle.callStatic.checkUpkeep([]); // here call static just use to call upkepp without doing transactions
          console.log(upKeepNeeded, "upkeepNeeded");

          assert(!upKeepNeeded);
        });

        it("return false if raffle is not open", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            raffleInterval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          await raffle.performUpkeep([]);
          // now check raffle state

          const raffleState = await raffle.getRaffleState();
          assert.equal(raffleState.toString(), "1");

          const { upKeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          console.log(upKeepNeeded, "upKeepNeeded");
          assert.equal(upKeepNeeded, false);
        });

        it("return false if enough time has not passed", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            raffleInterval.toNumber() - 1,
          ]);

          await network.provider.send("evm_mine", []);

          const { upKeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert.equal(upKeepNeeded, false);
        });

        it("returns true if enough time has passed, has players, eth, is open", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            raffleInterval.toNumber() + 1,
          ]);

          await network.provider.send("evm_mine", []);
          const { upKeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert(upKeepNeeded);
        });
      });

      describe("performUpKeep", function () {
        it("it can only run if checkUpekeep true", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            raffleInterval.toNumber() + 1,
          ]);

          await network.provider.send("evm_mine", []);
          const tx = await raffle.performUpkeep([]);
          assert(tx);
        });

        it("revert when checkUpkeep false", async function () {
          await expect(raffle.performUpkeep([])).to.be.revertedWith(
            "Raffle_UpkeepNotNeeded"
          );
        });

        it("updates raffle state, events and calls the vrf cordinator", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            raffleInterval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          const transactionResponse = await raffle.performUpkeep([]);
          const txReceipt = await transactionResponse.wait(1);
          const requestId = txReceipt.events[1].args.requestId;
          //now check the raffle state

          const raffleState = await raffle.getRaffleState();
          assert(requestId.toNumber() > 0);
          assert(raffleState.toString() == 1);
        });
      });

      describe("fulfillRandomWords", function () {
        // first to perform all test we need to mine the all block by increasing time manually

        beforeEach(async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            raffleInterval.toNumber() + 1,
          ]);
        });

        it("it can be called after performUpKeep", async function () {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
          ).to.be.revertedWith("nonexistent request"); // here we are getting request id but it will  throw an error because we have not performed performupkeep
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
          ).to.be.revertedWith("nonexistent request");
        });

        it("pick random winner, resets the lottery, sends money", async function () {
          accounts = await ethers.getSigners(); // gives list of accounts
          const additionalEntrants = 3;
          const startingAccountIndex = 1; // deployer 0  ===> ne account start from index 1

          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + additionalEntrants;
            i++
          ) {
            const accountRaffleConnected = raffle.connect(accounts[i]);
            await accountRaffleConnected.enterRaffle({
              value: raffleEntranceFee,
            });
          }

          const lastTimeStamp = await raffle.getLatestTimeStamp();

          // perform up keep
          // call fullfillRandomwords
          //and then wait for fullfillRandomwords

          await new Promise(async (resolve, reject) => {
            raffle.once("winnerPicked", async () => {
              console.log("winner found");
              try {
                // we are checking all variable has been reset or not after picking random winner
                const recentWinner = await raffle.getRecentWinner();
                console.log(recentWinner, "recentWinner");
                console.log(accounts[0].address);
                console.log(accounts[1].address);
                console.log(accounts[2].address);
                console.log(accounts[3].address);

                const raffleState = await raffle.getRaffleState();
                const endingTimeStamp = await raffle.getLatestTimeStamp();
                const numPlayer = await raffle.getNumberOfplayer();
                const winnerEndingBalance = await accounts[1].getBalance();

                assert.equal(numPlayer.toString(), "0");
                assert.equal(raffleState.toString(), "0");
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStatringBalance
                    .add(
                      raffleEntranceFee
                        .mul(additionalEntrants)
                        .add(raffleEntranceFee)
                    )
                    .toString()
                );
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStatringBalance
                    .add(raffleEntranceFee.mul(additionalEntrants))
                    .toString()
                );
                assert(endingTimeStamp > lastTimeStamp);
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const tx = await raffle.performUpkeep([]);
            const txReceipt = await tx.wait(1);
            const winnerStatringBalance = await accounts[1].getBalance();

            // fullfillrandom words takes 2 params requstid and consumer address. once it is called it will emit "WinnerPicked" will be picked by promise
            vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.toString(),
              raffle.address
            );
          });
        });
      });
    });
