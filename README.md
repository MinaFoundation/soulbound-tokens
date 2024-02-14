# Reference implementation for Soulbound Tokens on Mina

## Soulbound Tokens

Soulbound Tokens (SBTs)are tokens that can be minted and burned, but not transferred. Thus, once created, they are bound to a specific account. They have been introduced in by [Weyl, Ohlhaver, and Buterin](https://deliverypdf.ssrn.com/delivery.php?ID=024094113006074084068090083083002102099074018037042059108095065004025006107091098074121060123119021098114124082003091083104116027080071064004069000082112003086113101067062033017010089116112119093027117126025089067099084001096084122028105088089029124073&EXT=pdf&INDEX=TRUE), along with several ideas for applications that they enable.


This repository contains a reference implementation, showing how SBTs  can be implemented on Mina using `o1js`.


## How to build

```sh
npm run build
```

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```

## License

[Apache-2.0](LICENSE)
