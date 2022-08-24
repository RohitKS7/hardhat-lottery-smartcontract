// // SPDX-License-Identifier: MIT

// pragma solidity ^0.8.7;

// // SECTION THIS imports are for get random number from chainlinkVRF
// import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
// import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
// // SECTION THIS import will create time interval to announce new Lotterywinner
// // import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
// import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

// error Lottery__UpKeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 lotteryState);
// error Lottery__SendMoreToEnterLottery();
// error Lottery__TransferFailed();
// error Lottery__NotOpen();

// /** @title A Sample Lottery Contract
//  * @author Rohit Kumar Suman
//  * @notice This contract is for creating an untamperable  decentralized smart contract
//  * @dev This implements Chainlink VRF v2 and Chainlink Keepers
//  */
// // NOTE Calling contracts must inherit from VRFConsumerBase (in this case Lottery) and KeeperCompatibleInterface
// contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
//     // SECTION Type Declarations **************************************************
//     enum LotteryState {
//         OPEN,
//         CALCULATING
//     } // secretly enum is uint here => uint256 0 = OPEN, 1 = CALCULATING

//     // SECTION state variables **************************************************
//     uint256 private immutable i_entranceFee;

//     // ANCHOR array of players address, who entered in lottery contract
//     address payable[] private s_players;

//     // ANCHOR using this contract to requestRandomWinner(or "requestRandomWords" mentioned in chainlink contract)
//     VRFCoordinatorV2Interface private immutable i_vrfCoordinator;

//     // ANCHOR gaslane(or keyHash) = it is the maximum number of gas(gaslimit) We want to spend to get random number from chainlink orcale.
//     //     Different keyHash's have different gas price
//     //    * ceilings, so you can select a specific one to bound your maximum per request cost.
//     bytes32 private immutable i_gaslane;

//     // ANCHOR The ID of the VRF subscription. Must be funded with the minimum subscription balance required for the selected keyHash.
//     uint64 private immutable i_subscriptionId;

//     // ANCHOR RequestConfirmations - How many blocks you'd like the oracle to wait before responding to the request.
//     uint16 private constant REQUEST_CONFIRMATIONS = 3;

//     // ANCHOR callbackGasLimit - How much gas you'd like to receive in your fulfillRandomWords callback. Note that gasleft() inside fulfillRandomWords may be slightly less than this amount because of gas used calling the function(argument decoding etc.), so you may need to request slightly more than you expect to have inside fulfillRandomWords. The acceptable range is [0, maxGasLimit]
//     uint32 private immutable i_callbackGasLimit;

//     // ANCHOR numWords = how many random numbers we want
//     uint32 private constant NUM_WORDS = 1;

//     // SECTION LOTTERY (state) VARIABLES **************************************************
//     address private s_recentWinner;
//     LotteryState private s_lotteryState;
//     // ANCHOR get the "last block timestamp" in order to get if enough time has passed to run new lottery game
//     uint256 private s_lastTimeStamp;
//     // ANCHOR to set the interval b/w next lottery game
//     uint256 private immutable i_interval;

//     // SECTION Events **************************************************
//     // NOTE name events with the function name reversed
//     event LotteryEnter(address indexed player); // indexed = will index this data in logs
//     event RequestedLotteryWinner(uint256 indexed requestId);
//     event WinnerPicked(address indexed winner);

//     // SECTION Constructor **************************************************
//     constructor(
//         address vrfCoordinatorV2,
//         uint256 entranceFee,
//         bytes32 gaslane,
//         uint64 subscriptionId,
//         uint32 callbackGasLimit,
//         uint256 interval
//     ) VRFConsumerBaseV2(vrfCoordinatorV2) {
//         i_entranceFee = entranceFee;
//         i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
//         i_gaslane = gaslane;
//         i_subscriptionId = subscriptionId;
//         i_callbackGasLimit = callbackGasLimit;
//         s_lotteryState = LotteryState.OPEN;
//         s_lastTimeStamp = block.timestamp;
//         i_interval = interval;
//     }

//     // SECTION ENTER LOTTERY FUNCTION **************************************************
//     function enterLottery() public payable {
//         if (msg.value < i_entranceFee) {
//             revert Lottery__SendMoreToEnterLottery();
//         }
//         // if lottery is not open for any reason
//         if (s_lotteryState != LotteryState.OPEN) {
//             revert Lottery__NotOpen();
//         }

//         s_players.push(payable(msg.sender));
//         // Emit an event when we update a dynamic array or mapping
//         emit LotteryEnter(msg.sender);
//     }

//     /**
//      * @dev This is the function that the chainlink keeper nodes call they look for the `upKeepNeeded` to return true.
//      * The following conditions should be true in order to return true:
//      * 1. The Lottery should be in an "open" state.
//      * 2. Our time interval should have passed.
//      * 3. The lottery should have atleast 1 player, and have some ETH
//      * 4. Our subscription is funded with LINK.
//      *
//      */
//     // SECTION Check UpKeep Function **************************************************
//     function checkUpkeep(
//         bytes memory /*checkData*/
//     )
//         public
//         view
//         override
//         returns (
//             bool upKeepNeeded,
//             bytes memory /*performData*/
//         )
//     {
//         // ANCHOR CHECK-1 IF "Lottery is open!""
//         bool isOpen = (LotteryState.OPEN == s_lotteryState);
//         // ANCHOR CHECK-2 IF "Our time interval have passed!"
//         // NOTE to get current time we're gonna need = block.timestamp (global variable) but to get if enough time has passed, we're going to need to get the "last block timestamp"
//         bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
//         // ANCHOR CHECK-3 if "The lottery have any player"
//         bool hasPlayers = (s_players.length > 0);
//         // ANCHOR CHECK-3.2 if "The lottery have some ETH"
//         bool hasBalance = address(this).balance > 0;
//         // ANCHOR return variable, if it is true then it's time to request new random number
//         bool upKeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
//     }

//     // SECTION To GET Random Number FUNCTION **************************************************
//     function performUpkeep(
//         bytes calldata /*performData*/
//     ) external override {
//         // ANCHOR checking if checkUpKeep is true! so it only runs if it's true and nobody can call this function out of blue
//         (bool upKeepNeeded, ) = checkUpkeep("");
//         if (!upKeepNeeded) {
//             // NOTE adding some parameters in error. so, we can see why its reverting
//             revert Lottery__UpKeepNotNeeded(
//                 address(this).balance,
//                 s_players.length,
//                 uint256(s_lotteryState)
//             );
//         }

//         // NOTE its function of VRFCoordinatorV2Interface contract in chainlink
//         // ANCHOR this requestRandomWords returns a unique request ID that defines who is requesting this requestRandomWords parameters.
//         s_lotteryState = LotteryState.CALCULATING; // random number is calculating so nobody can enter our lottery.
//         uint256 requestId = i_vrfCoordinator.requestRandomWords(
//             i_gaslane,
//             i_subscriptionId,
//             REQUEST_CONFIRMATIONS,
//             i_callbackGasLimit,
//             NUM_WORDS
//         );
//         emit RequestedLotteryWinner(requestId);
//     }

//     // SECTION GET RANDOM NUMBER and What to do with that random number **************************************************
//     // ANCHOR once we get the random number we would like to pick a random winner from the s_players array
//     function fulfillRandomWords(
//         uint256, /*requestId*/
//         uint256[] memory randomWords
//     ) internal override {
//         /* NOTE  analogy of how random winnner picked!
//          To pick a random number we will modulo from solidity which works something like this -
//         - s_players size is 10 (10 players)
//         - randomNumber = 202 (in reality this will be a massive number)
//         - 202 % 10 (10 works like modulo here) = 20.2 
//         - Modulo dont give answer in decimal. It'll give that which is doesn't divide evenly into 202, That number is "2"
//         -  20 * 10 = 200 (202 - 200 = 2 )
//         - Random Winner will be 2nd player
//          */
//         uint256 indexOfWinner = randomWords[0] % s_players.length;
//         // randomWords[0] = coz we are getting only 1 random number
//         address payable recentWinner = s_players[indexOfWinner];
//         s_recentWinner = recentWinner;

//         // ANCHOR lottery is open again for new round
//         s_lotteryState = LotteryState.OPEN;

//         // ANCHOR resetting the players array to new
//         s_players = new address payable[](0);

//         // ANCHOR resetting the timestamp
//         s_lastTimeStamp = block.timestamp;

//         // ANCHOR sending all the money to the winner
//         (bool success, ) = recentWinner.call{value: address(this).balance}("");
//         if (!success) {
//             revert Lottery__TransferFailed();
//         }

//         // ANCHOR query emit winners easily
//         emit WinnerPicked(recentWinner);
//     }

//     // SECTION reading state variables value from blockchain **************************************************
//     function getEntranceFee() public view returns (uint256) {
//         return i_entranceFee;
//     }

//     function getPlayer(uint256 index) public view returns (address) {
//         return s_players[index];
//     }

//     function getRecentwinner() public view returns (address) {
//         return s_recentWinner;
//     }

//     function getLotteryState() public view returns (LotteryState) {
//         return s_lotteryState;
//     }

//     // NOTE since NUM_WORDS is in bytes code coz it is a CONSTANT variable, So this function isn't reading from storage therefore we made this pure instead of view
//     function getNumWords() public pure returns (uint256) {
//         return NUM_WORDS;
//     }

//     function getNumberOfPlayers() public view returns (uint256) {
//         return s_players.length;
//     }

//     function getLastTimeStamp() public view returns (uint256) {
//         return s_lastTimeStamp;
//     }

//     function getRequestConfirmations() public pure returns (uint256) {
//         return REQUEST_CONFIRMATIONS;
//     }
// }
