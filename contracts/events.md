# What are Events in smart contract?

EVM (ethereum virtual machine) creates something like data structure called "logs".

## Logs?

It is possible to store data in a _specially indexed data structure_ that maps all the way up to the block level. This feature called **logs** is used by solidity in order to implement **events**. Contracts cannot access log data after it has been created, but they can be efficiently accessed from outside the blockchain.

## Events?

Events allows us to print some stuff to this log system even after the contract is created. Which makes it more gas efficient than storage variables.

Events are tied to smartcontracts and emit some information that we listen.

By Listing to this emitted info we execute our next step and its very helpful in Frontend.
