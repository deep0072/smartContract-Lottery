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
        vrfCoordinateMock,
        raffleEntranceFee,
        deployer,
        raffleInterval;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]); // deploying contracts that are mentioned as tag all in deploy folder's files
        raffle = await ethers.getContract("Raffle", deployer);
        vrfCoordinateMock = await ethers.getContract(
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
    });
