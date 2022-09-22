// Raffle
// enter the lottery amount
//pick a random winner
//winner to selected every X minutes -> completely automate
//Chainlink Oracle -> Randomness,Automated Execution

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

error Raffle_NotEnoughEthEntered();

contract Raffle {
    // now create entrance fee

    uint256 private immutable i_entranceFee;
    address[] private s_players;

    constructor(uint256 entranceFee) {
        i_entranceFee = entranceFee;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            //checking entrance fee is more than enough or not
            revert Raffle_NotEnoughEthEntered();
        }

        // now adding sender into player list who pay sufficeint fund
        s_players.push(payable(msg.sender));

        //emit an event  when sender added in array
    }

    // function pickRandomWinner() {}

    //read entrance Fee
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint index) public view returns (address) {
        return (s_players[index]);
    }
}
