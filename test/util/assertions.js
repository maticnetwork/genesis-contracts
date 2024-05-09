async function expectRevert(tx, revertData) {
  try {
    await tx
    assert.fail(`expected revert ${revertData} not received`)
  } catch (e) {
    assert.include(
      e.message,
      revertData,
      `expected to revert with ${revertData} but got ${e.message} instead`
    )
  }
}

module.exports = {
  expectRevert
}
