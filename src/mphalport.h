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
