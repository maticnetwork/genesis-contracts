pragma solidity ^0.5.11;

library IterableMapping {
  struct Map {
    mapping(uint256 => IndexValue) data;
    KeyFlag[] keys;
    uint256 size;
  }

  struct IndexValue { uint256 keyIndex; bool value; }
  struct KeyFlag { uint256 key; bool deleted; }

  function insert(Map storage self, uint256 key, bool value) internal returns (bool replaced) {
    uint256 keyIndex = self.data[key].keyIndex;
    self.data[key].value = value;
    if (keyIndex > 0) {
      return true;
    } else {
      keyIndex = self.keys.length++;
      self.data[key].keyIndex = keyIndex + 1;
      self.keys[keyIndex].key = key;
      self.size++;
      return false;
    }
  }

  function remove(Map storage self, uint256 key) internal returns (bool success) {
    uint256 keyIndex = self.data[key].keyIndex;
    if (keyIndex == 0) {
      return false;
    }
    delete self.data[key];
    self.keys[keyIndex - 1].deleted = true;
    self.size--;
  }

  function contains(Map storage self, uint256 key) internal view returns (bool) {
    return self.data[key].keyIndex > 0;
  }

  function start(Map storage self) internal view returns (uint256 keyIndex) {
    return next(self, uint(-1));
  }
  
  function valid(Map storage self, uint256 keyIndex) internal view returns (bool) {
    return keyIndex < self.keys.length;
  }

  // Iterate next
  function next(Map storage self, uint256 keyIndex) internal view returns (uint r_keyIndex) {
    keyIndex++;
    while (keyIndex < self.keys.length && self.keys[keyIndex].deleted) {
      keyIndex++;
    }
    return keyIndex;
  }

  // Get value from key index
  function get(Map storage self, uint256 keyIndex) internal view returns (uint256 key, bool value) {
    key = self.keys[keyIndex].key;
    value = self.data[key].value;
  }
}
