"""Cross-platform fixes for the upstream GenLayer direct test runner."""

import os

import pytest


@pytest.fixture(scope="session", autouse=True)
def windows_genlayer_stdin_pipe():
    """Use an anonymous pipe instead of an undeletable Windows temp file."""

    if os.name != "nt":
        yield
        return

    from gltest.direct import loader

    original = loader._inject_message_to_fd0

    def inject_with_pipe(vm):
        from genlayer.py import calldata
        from genlayer.py.types import Address

        sender = Address(vm.sender) if isinstance(vm.sender, bytes) else vm.sender
        contract = (
            Address(vm._contract_address)
            if isinstance(vm._contract_address, bytes)
            else vm._contract_address
        )
        origin = Address(vm.origin) if isinstance(vm.origin, bytes) else vm.origin
        encoded = calldata.encode(
            {
                "contract_address": contract,
                "sender_address": sender,
                "origin_address": origin,
                "stack": [],
                "value": vm._value,
                "datetime": vm._datetime,
                "is_init": False,
                "chain_id": vm._chain_id,
                "entry_kind": 0,
                "entry_data": b"",
                "entry_stage_data": None,
            }
        )
        read_fd, write_fd = os.pipe()
        try:
            os.write(write_fd, encoded)
        finally:
            os.close(write_fd)
        vm._original_stdin_fd = os.dup(0)
        try:
            os.dup2(read_fd, 0)
        finally:
            os.close(read_fd)

    loader._inject_message_to_fd0 = inject_with_pipe
    try:
        yield
    finally:
        loader._inject_message_to_fd0 = original
