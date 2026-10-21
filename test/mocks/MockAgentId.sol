// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @dev Soulbound stand-in for the SPACE ID Agent ID registry.
contract MockAgentId is ERC721("SPACE ID Agent ID", "AI") {
    error Soulbound();

    function mint(address to, uint256 id) external {
        _mint(to, id);
    }

    function _update(address to, uint256 id, address auth) internal override returns (address from) {
        from = _ownerOf(id);
        if (from != address(0)) revert Soulbound();
        return super._update(to, id, auth);
    }
}
