const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Unit Tests", function () {
          let lottery, vrfCoordinatorV2Mock, lotteryEntranceFee, deployer, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["mocks", "lottery"]) // Deploys modules with the tags "mocks" and "lottery"
              lottery = await ethers.getContract("Lottery", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              lotteryEntranceFee = await lottery.getEntranceFee()
              interval = await lottery.getInterval()
          })

          describe("constructor", () => {
              it("Intializes the Lottery Contract Correctly", async () => {
                  // NOTE // Ideally, we'd separate these out so that only 1 assert per "it" block
                  //  and Ideally we also test for all the constructor
                  const lotteryState = await lottery.getLotteryState()
                  const entranceFee = await lottery.getEntranceFee()
                  assert.equal(lotteryState.toString(), "0")
                  assert.equal(entranceFee.toString(), networkConfig[chainId]["entranceFee"])
              })
          })

          describe("enterLottery", () => {
              it("reverts when you don't pay enough", async () => {
                  // NOTE we will only expecting here that we are entering in the lottery
                  await expect(lottery.enterLottery()).to.be.revertedWith(
                      "Lottery__SendMoreToEnterLottery"
                  )
              })
              it("record players when they enter the lottery", async () => {
                  // TODO // 1. Get Entrance fee
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  // TODO // 1. Get Player
                  const playerFromContract = await lottery.getPlayer(0)
                  assert.equal(playerFromContract, deployer)
              })
              it("emits events on enter", async () => {
                  await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.emit(
                      lottery,
                      "LotteryEnter"
                  )
              })
              it("Can't Enter the Lottery when its in closed state", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  // NOTE // There's too many things happing behind this test. So you can watch the "Patick's 32 hrs full blockchain course" at `15:33:00` timeStamp
                  // TODO // here we are increasing the interval time So, "needUpKeep" will return true and "perfromUpKeep" should go into calculating state/ Closed State
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", []) // mine 1 extra block

                  //   ANCHOR // We pretend to be a chainlink keeper
                  await lottery.performUpkeep([]) // [] = blank calldata // NOTE and now it's in a calculating state
                  await expect(
                      lottery.enterLottery({ value: lotteryEntranceFee })
                  ).to.be.revertedWith("Lottery__NotOpen")
              })
          })
          describe("checkUpkeep", () => {
              it("returns false if people haven't send any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upKeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert(!upKeepNeeded)
              })
              it("returns false if lottery isn't open", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await lottery.performUpkeep([])
                  const lotteryState = await lottery.getLotteryState()
                  const { upKeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert.equal(lotteryState.toString() == "1", upKeepNeeded == false)
              })
              it("return false if interval time hasn't passed", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 1]) // decreasing time here with substraction symbol
                  await network.provider.send("evm_mine", [])
                  const { upKeepNeeded } = await lottery.callStatic.checkUpkeep("0x") // "0x" is same as empty [] array
                  expect(!upKeepNeeded).to.be.false
              })
          })

          describe("performUpkeep", () => {
              it("it can only run if checkupkeep is true", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await lottery.performUpkeep([])
                  assert(tx)
              })

              it("it will revert when checkupkeep is false", async () => {
                  await expect(lottery.performUpkeep([])).to.be.revertedWith(
                      "Lottery__UpKeepNotNeeded"
                  )
              })

              it("updates the raffle state, emits an event, and calls the vrf coordinator", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const txResposne = await lottery.performUpkeep([])
                  const txReceipt = await txResposne.wait(1)
                  const lotteryState = await lottery.getLotteryState()
                  //   NOTE  // we are getting this emit event from VRFCoordinator contract directly
                  const requestId = txReceipt.events[1].args.requestId
                  assert(requestId.toNumber() > 0)
                  assert(lotteryState.toString() == "1")
              })
          })

          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
              })

              it("Can only be called after performupkeep requested a RandomWord from vrfCoordinator contract", async () => {
                  // NOTE // this mock contract calls these function. fulfillRandomWords function takes 2 parameters (requestId, Consumer Address) and reverts when there's a false call for randomword
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
                  ).to.be.revertedWith("nonexistent request")

                  //   TODO // Doing same thing with different RequestId
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
                  ).to.be.revertedWith("nonexistent request")
              })

              //   IT basically puts all things together at one spot
              it("picks a winner, resets the lottery, and sends money", async () => {
                  //   adding more fake accounts to enter in our lottery
                  const startingAccountIndex = 1 // since deployer is 0. New accounts will starts from index 1
                  const additionalEntrances = 3
                  const accounts = await ethers.getSigners()
                  for (let i = startingAccountIndex; i <= additionalEntrances; i++) {
                      // we're gonna connect new accounts with our lottery contract
                      const accountConnectedLottery = lottery.connect(accounts[i])
                      await accountConnectedLottery.enterLottery({ value: lotteryEntranceFee })
                  }

                  // Now we've to capture the startingTimeStamp
                  const startingTimeStamp = await lottery.getLastTimeStamp()

                  //     TODO STEPS //
                  //   1. run performUpkeep (mock being chainlink keeepers)
                  //   2. run fulfillRandomWords (mock being chainklink VRF)
                  //   3. We will have to wait for the fulfillRandomWords to be called on testnet but not on local chain. So, we'll stimulate testnet's conditon here. In order to do this have to listen to listener here.
                  await new Promise(async (resolve, reject) => {
                      // NOTE // If these Promise didn't resolve in "mocha timeout" (see hardhat.config) time Limit then these test will fail
                      //   once WinnerPicked events emitted (available in lottery.sol) try and catch
                      lottery.once("WinnerPicked", async () => {
                          console.log("Found the events")
                          try {
                              // checking every conditions in fulfillrandomwords function in lottery.sol
                              const recentWinner = await lottery.getRecentwinner()
                              console.log(recentWinner)
                              console.log(accounts[0].address)
                              console.log(accounts[1].address)
                              console.log(accounts[2].address)
                              console.log(accounts[3].address)

                              const lotteryState = await lottery.getLotteryState()
                              const playersCount = await lottery.getNumberOfPlayers()
                              const endingTimeStamp = await lottery.getLastTimeStamp()
                              const winnerEndingBalance = await accounts[1].getBalance()

                              assert.equal(playersCount.toString(), "0")
                              assert.equal(lotteryState.toString(), "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(
                                      lotteryEntranceFee
                                          .mul(additionalEntrances)
                                          .add(lotteryEntranceFee)
                                          .toString()
                                  )
                              )
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })
                      //    setting up the listener
                      //    below, we will fire the event, and the listener will pick the winner, and retuns it
                      const tx = await lottery.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      const winnerStartingBalance = await accounts[1].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          lottery.address
                      )
                  })
              })
          })

          //       it("picks a winner, resets the lottery, and sends money", async () => {
          //           await lottery.enterLottery({ value: lotteryEntranceFee })
          //           await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          //           await network.provider.send("evm_mine", [])
          //           const accounts = await ethers.getSigners()
          //           const startingAccountIndex = 1
          //           const additionalEntrances = 3
          //           for (let i = startingAccountIndex; i <= additionalEntrances; i++) {
          //               const accountConnectedLottery = lottery.connect(accounts[i])
          //               await accountConnectedLottery.enterLottery({ value: lotteryEntranceFee })
          //           }

          //           const startingTimeStamp = await lottery.getLastTimeStamp()
          //           const tx = await lottery.performUpkeep([])
          //           const txReceipt = await tx.wait(1)
          //           const winnerStartingBalance = await accounts[1].getBalance()
          //           await vrfCoordinatorV2Mock.fulfillRandomWords(
          //               txReceipt.events[1].args.requestId,
          //               lottery.address
          //           )

          //           const recentWinner = await lottery.getRecentwinner()
          //           console.log(recentWinner)
          //           console.log(accounts[0].address)
          //           console.log(accounts[1].address)
          //           console.log(accounts[2].address)
          //           console.log(accounts[3].address)
          //           const lotteryState = await lottery.getLotteryState()
          //           const playersCount = await lottery.getNumberOfPlayers()
          //           const endingTimeStamp = await lottery.getLastTimeStamp()
          //           const winnerEndingBalance = await accounts[1].getBalance()
          //           assert.equal(playersCount.toString(), "0")
          //           assert.equal(lotteryState.toString(), "0")
          //           assert(endingTimeStamp > startingTimeStamp)
          // assert.equal(
          //     winnerEndingBalance.toString(),
          //     winnerStartingBalance.add(
          //         lotteryEntranceFee
          //             .mul(additionalEntrances)
          //             .add(lotteryEntranceFee)
          //             .toString()
          //     )
          // )
          //       })
      })
//   })
