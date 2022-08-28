const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Unit Tests", function () {
          let lottery, lotteryEntranceFee, deployer

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              lottery = await ethers.getContract("Lottery", deployer)
              lotteryEntranceFee = await lottery.getEntranceFee()
          })

          describe("fulfillRandomWords", () => {
              it("works with live Chainlink keepers and Chainlink VRF, we get a random winner", async () => {
                  console.log("Setting up test....")
                  const startingTimeStamp = await lottery.getLastTimeStamp()
                  const accounts = await ethers.getSigners()

                  await new Promise(async (resolve, reject) => {
                      //   setup listener before we enter the lottery
                      //  just in case the blockchain moves Really Fast
                      lottery.once("WinnerPicked", async () => {
                          console.log("Winner Event Picked!!....")
                          try {
                              const recentWinner = await lottery.getRecentwinner()
                              const lotteryState = await lottery.getLotteryState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await lottery.getLastTimeStamp()

                              //   await expect(lottery.getPlayer(0)).to.be.reverted
                              assert.equal(lotteryState.toString(), "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(lotteryEntranceFee).toString()
                              )
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject()
                          }
                      })
                      console.log("Entering Raffle")
                      const tx = await lottery.enterLottery({ value: lotteryEntranceFee })
                      await tx.wait(1)

                      console.log("Ok, time to wait")
                      const winnerStartingBalance = await accounts[0].getBalance()
                  })
              })
          })
      })
