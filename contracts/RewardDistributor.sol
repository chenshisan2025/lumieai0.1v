// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {MerkleProof} from "openzeppelin-contracts/contracts/utils/cryptography/MerkleProof.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
contract RewardDistributor {
    address public owner; IERC20 public token;
    struct WeekInfo { bytes32 merkleRoot; mapping(uint256=>uint256) claimedBitMap; }
    mapping(uint256=>WeekInfo) private weeks;
    event Claimed(uint256 indexed week, uint256 indexed index, address indexed account, uint256 amount);
    event WeekRootSet(uint256 indexed week, bytes32 root);
    modifier onlyOwner(){ require(msg.sender==owner,"not owner"); _; }
    constructor(address tokenAddress){ owner=msg.sender; token=IERC20(tokenAddress); }
    function setWeekRoot(uint256 week, bytes32 root) external onlyOwner { weeks[week].merkleRoot=root; emit WeekRootSet(week, root); }
    function isClaimed(uint256 week, uint256 index) public view returns(bool){
        uint256 wordIndex=index/256; uint256 bitIndex=index%256;
        uint256 word=weeks[week].claimedBitMap[wordIndex]; uint256 mask=(1<<bitIndex);
        return word & mask == mask;
    }
    function _setClaimed(uint256 week, uint256 index) private {
        uint256 wordIndex=index/256; uint256 bitIndex=index%256;
        weeks[week].claimedBitMap[wordIndex] = weeks[week].claimedBitMap[wordIndex] | (1<<bitIndex);
    }
    function claim(uint256 week, uint256 index, address account, uint256 amount, bytes32[] calldata proof) external {
        require(!isClaimed(week,index),"claimed");
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        require(MerkleProof.verify(proof, weeks[week].merkleRoot, node), "bad proof");
        _setClaimed(week,index);
        require(token.transfer(account, amount), "transfer failed");
        emit Claimed(week,index,account,amount);
    }
}