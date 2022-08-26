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
                  const requestId = txReceipt.event[1].args.requestId
                  assert(requestId.toNumber() > 0)
                  //   assert(lotteryState.toNumber() == 1)
              })
          })
      })
