#include "py/obj.h"
#include "py/ringbuf.h"
#include "microbithal.h"
#include "modmicrobit.h"

// Constants for the nRF needed by the radio module.
#define RADIO_MODE_MODE_Nrf_1Mbit (0)
#define RADIO_MODE_MODE_Nrf_2Mbit (1)

extern ringbuf_t stdin_ringbuf;

void mp_hal_set_interrupt_char(int c);

static inline uint32_t mp_hal_disable_irq(void) {
    return 0;
}

static inline void mp_hal_enable_irq(uint32_t state) {
    (void)state;
}

static inline void mp_hal_unique_id(uint32_t id[2]) {
    id[0] = 0;
    id[1] = 0;
}

// Without these py/mphal.h falls back to the virtual pin API, which calls
// through a pin protocol that the micro:bit pin types don't have.
#define mp_hal_pin_obj_t uint8_t
#define mp_hal_get_pin_obj(obj) microbit_obj_get_pin_name(obj)
#define mp_hal_pin_read(pin) microbit_hal_pin_read(pin)
