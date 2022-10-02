#include "py/runtime.h"

// Just defines the memory access functions, otherwise we use codal_port's
// implementation.

uintptr_t machine_mem_get_read_addr(mp_obj_t addr_o, uint align) {
    uintptr_t addr = mp_obj_get_int_truncated(addr_o);
        if ((addr & (align - 1)) != 0) {
        mp_raise_msg_varg(&mp_type_ValueError, MP_ERROR_TEXT("address %08x is not aligned to %d bytes"), addr, align);
    }

    static const uint32_t FICR = 0x10000000;
    static const uint32_t FICR_DEVICEID_0 = FICR + 0x060;
    static const uint32_t FICR_DEVICEID_1 = FICR + 0x064;

    static uint32_t mem;
    switch (addr) {
        case FICR_DEVICEID_0:
        case FICR_DEVICEID_1: {
            // There's machine.unique_id backed by hal for this
            // but existing code reads via FICR.
            mem = 0;
            break;
        }
        default: {
            mp_raise_NotImplementedError(MP_ERROR_TEXT("simulator limitation: memory read"));
        }
    }
    return (uintptr_t)&mem;
}

uintptr_t machine_mem_get_write_addr(mp_obj_t addr_o, uint align) {
    mp_raise_NotImplementedError(MP_ERROR_TEXT("simulator limitation: memory write"));
}
