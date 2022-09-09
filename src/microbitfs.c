/*
 * This file is part of the Micro Python project, http://micropython.org/
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 Mark Shannon
 * Copyright (c) 2017 Ayke van Laethem
 * Copyright (c) 2022 Damien P. George
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

#include "py/stream.h"
#include "py/runtime.h"
#include "extmod/vfs.h"
#include "ports/nrf/modules/uos/microbitfs.h"
#include "jshal.h"

#if MICROPY_MBFS

// This is a version of microbitfs for the simulator.
// File data is stored externally in JavaScripti and access via mp_js_hal_filesystem_xxx() functions.

#define MAX_FILENAME_LENGTH (120)

/******************************************************************************/
// os-level functions

STATIC mp_obj_t uos_mbfs_listdir(void) {
    mp_obj_t res = mp_obj_new_list(0, NULL);
    char buf[MAX_FILENAME_LENGTH];
    for (size_t i = 0;; ++i) {
        int len = mp_js_hal_filesystem_name(i, buf);
        if (len < 0) {
            // End of listing.
            break;
        }
        if (len > 0) {
            mp_obj_list_append(res, mp_obj_new_str(buf, len));
        }
    }
    return res;
}
MP_DEFINE_CONST_FUN_OBJ_0(uos_mbfs_listdir_obj, uos_mbfs_listdir);

typedef struct {
    mp_obj_base_t base;
    mp_fun_1_t iternext;
    uint8_t idx;
} uos_mbfs_ilistdir_it_t;

STATIC mp_obj_t uos_mbfs_ilistdir_it_iternext(mp_obj_t self_in) {
    uos_mbfs_ilistdir_it_t *self = MP_OBJ_TO_PTR(self_in);
    for (;;) {
        char buf[MAX_FILENAME_LENGTH];
        int len = mp_js_hal_filesystem_name(self->idx, buf);
        if (len < 0) {
            return MP_OBJ_STOP_ITERATION;
        }
        self->idx += 1;
        if (len > 0) {
            mp_obj_t name = mp_obj_new_str(buf, len);
            mp_obj_tuple_t *t = MP_OBJ_TO_PTR(mp_obj_new_tuple(3, NULL));
            t->items[0] = name;
            t->items[1] = MP_OBJ_NEW_SMALL_INT(MP_S_IFREG); // all entries are files
            t->items[2] = MP_OBJ_NEW_SMALL_INT(0); // no inode number
            return MP_OBJ_FROM_PTR(t);
        }
    }
}

STATIC mp_obj_t uos_mbfs_ilistdir(void) {
    uos_mbfs_ilistdir_it_t *iter = m_new_obj(uos_mbfs_ilistdir_it_t);
    iter->base.type = &mp_type_polymorph_iter;
    iter->iternext = uos_mbfs_ilistdir_it_iternext;
    iter->idx = 0;
    return MP_OBJ_FROM_PTR(iter);
}
MP_DEFINE_CONST_FUN_OBJ_0(uos_mbfs_ilistdir_obj, uos_mbfs_ilistdir);

STATIC mp_obj_t uos_mbfs_remove(mp_obj_t filename_in) {
    size_t name_len;
    const char *name = mp_obj_str_get_data(filename_in, &name_len);
    int idx = mp_js_hal_filesystem_find(name, name_len);
    if (idx < 0) {
        mp_raise_OSError(MP_ENOENT);
    }
    mp_js_hal_filesystem_remove(idx);
    return mp_const_none;
}
MP_DEFINE_CONST_FUN_OBJ_1(uos_mbfs_remove_obj, uos_mbfs_remove);

STATIC mp_obj_t uos_mbfs_stat(mp_obj_t filename_in) {
    size_t name_len;
    const char *name = mp_obj_str_get_data(filename_in, &name_len);
    int idx = mp_js_hal_filesystem_find(name, name_len);
    if (idx < 0) {
        mp_raise_OSError(MP_ENOENT);
    }
    mp_obj_t file_size = mp_obj_new_int(mp_js_hal_filesystem_size(idx));

    mp_obj_tuple_t *t = MP_OBJ_TO_PTR(mp_obj_new_tuple(10, NULL));
    t->items[0] = MP_OBJ_NEW_SMALL_INT(MP_S_IFREG); // st_mode
    t->items[1] = MP_OBJ_NEW_SMALL_INT(0); // st_ino
    t->items[2] = MP_OBJ_NEW_SMALL_INT(0); // st_dev
    t->items[3] = MP_OBJ_NEW_SMALL_INT(0); // st_nlink
    t->items[4] = MP_OBJ_NEW_SMALL_INT(0); // st_uid
    t->items[5] = MP_OBJ_NEW_SMALL_INT(0); // st_gid
    t->items[6] = file_size;               // st_size
    t->items[7] = MP_OBJ_NEW_SMALL_INT(0); // st_atime
    t->items[8] = MP_OBJ_NEW_SMALL_INT(0); // st_mtime
    t->items[9] = MP_OBJ_NEW_SMALL_INT(0); // st_ctime
    return MP_OBJ_FROM_PTR(t);
}
MP_DEFINE_CONST_FUN_OBJ_1(uos_mbfs_stat_obj, uos_mbfs_stat);

/******************************************************************************/
// File object

typedef struct _mbfs_file_obj_t {
    mp_obj_base_t base;
    int idx;
    size_t offset;
    bool writable;
    bool open;
    bool binary;
} mbfs_file_obj_t;

STATIC mp_obj_t uos_mbfs_file___exit__(size_t n_args, const mp_obj_t *args) {
    (void)n_args;
    return mp_stream_close(args[0]);
}
STATIC MP_DEFINE_CONST_FUN_OBJ_VAR_BETWEEN(uos_mbfs_file___exit___obj, 4, 4, uos_mbfs_file___exit__);

STATIC mp_obj_t uos_mbfs_file_name(mp_obj_t self_in) {
    mbfs_file_obj_t *self = MP_OBJ_TO_PTR(self_in);
    char buf[MAX_FILENAME_LENGTH];
    int len = mp_js_hal_filesystem_name(self->idx, buf);
    return mp_obj_new_str(buf, len);
}
STATIC MP_DEFINE_CONST_FUN_OBJ_1(uos_mbfs_file_name_obj, uos_mbfs_file_name);

STATIC mp_obj_t microbit_file_writable(mp_obj_t self) {
    return mp_obj_new_bool(((mbfs_file_obj_t *)MP_OBJ_TO_PTR(self))->writable);
}
STATIC MP_DEFINE_CONST_FUN_OBJ_1(microbit_file_writable_obj, microbit_file_writable);

STATIC const mp_rom_map_elem_t uos_mbfs_file_locals_dict_table[] = {
    { MP_ROM_QSTR(MP_QSTR___enter__), MP_ROM_PTR(&mp_identity_obj) },
    { MP_ROM_QSTR(MP_QSTR___exit__), MP_ROM_PTR(&uos_mbfs_file___exit___obj) },
    { MP_ROM_QSTR(MP_QSTR_name), MP_ROM_PTR(&uos_mbfs_file_name_obj) },
    { MP_ROM_QSTR(MP_QSTR_writable), MP_ROM_PTR(&microbit_file_writable_obj) },

    { MP_ROM_QSTR(MP_QSTR_close), MP_ROM_PTR(&mp_stream_close_obj) },
    { MP_ROM_QSTR(MP_QSTR_read), MP_ROM_PTR(&mp_stream_read_obj) },
    { MP_ROM_QSTR(MP_QSTR_readinto), MP_ROM_PTR(&mp_stream_readinto_obj) },
    { MP_ROM_QSTR(MP_QSTR_readline), MP_ROM_PTR(&mp_stream_unbuffered_readline_obj) },
    { MP_ROM_QSTR(MP_QSTR_write), MP_ROM_PTR(&mp_stream_write_obj) },
};
STATIC MP_DEFINE_CONST_DICT(uos_mbfs_file_locals_dict, uos_mbfs_file_locals_dict_table);

STATIC void check_file_open(mbfs_file_obj_t *self) {
    if (!self->open) {
        mp_raise_ValueError(MP_ERROR_TEXT("I/O operation on closed file"));
    }
}

STATIC mp_uint_t microbit_file_read(mp_obj_t self_in, void *buf_in, mp_uint_t size, int *errcode) {
    mbfs_file_obj_t *self = MP_OBJ_TO_PTR(self_in);
    check_file_open(self);
    if (self->writable) {
        *errcode = MP_EBADF;
        return MP_STREAM_ERROR;
    }
    uint32_t bytes_read = 0;
    uint8_t *buf = buf_in;
    while (size--) {
        int chr = mp_js_hal_filesystem_readbyte(self->idx, self->offset);
        if (chr < 0) {
            break;
        }
        *buf++ = chr;
        self->offset += 1;
        bytes_read += 1;
    }
    return bytes_read;
}

STATIC mp_uint_t microbit_file_write(mp_obj_t self_in, const void *buf, mp_uint_t size, int *errcode) {
    mbfs_file_obj_t *self = MP_OBJ_TO_PTR(self_in);
    check_file_open(self);
    if (!self->writable) {
        *errcode = MP_EBADF;
        return MP_STREAM_ERROR;
    }
    bool success = mp_js_hal_filesystem_write(self->idx, buf, size);
    if (!success) {
        *errcode = MP_ENOSPC;
        return MP_STREAM_ERROR;
    }
    return size;
}

STATIC mp_uint_t microbit_file_ioctl(mp_obj_t self_in, mp_uint_t request, uintptr_t arg, int *errcode) {
    mbfs_file_obj_t *self = MP_OBJ_TO_PTR(self_in);

    if (request == MP_STREAM_CLOSE) {
        self->open = false;
        return 0;
    } else {
        *errcode = MP_EINVAL;
        return MP_STREAM_ERROR;
    }
}

STATIC const mp_stream_p_t textio_stream_p = {
    .read = microbit_file_read,
    .write = microbit_file_write,
    .ioctl = microbit_file_ioctl,
    .is_text = true,
};

const mp_obj_type_t uos_mbfs_textio_type = {
    { &mp_type_type },
    .name = MP_QSTR_TextIO,
    .protocol = &textio_stream_p,
    .locals_dict = (mp_obj_dict_t *)&uos_mbfs_file_locals_dict,
};


STATIC const mp_stream_p_t fileio_stream_p = {
    .read = microbit_file_read,
    .write = microbit_file_write,
    .ioctl = microbit_file_ioctl,
};

const mp_obj_type_t uos_mbfs_fileio_type = {
    { &mp_type_type },
    .name = MP_QSTR_FileIO,
    .protocol = &fileio_stream_p,
    .locals_dict = (mp_obj_dict_t *)&uos_mbfs_file_locals_dict,
};

STATIC mbfs_file_obj_t *microbit_file_open(const char *name, size_t name_len, bool write, bool binary) {
    if (name_len > MAX_FILENAME_LENGTH) {
        return NULL;
    }
    int idx;
    if (write) {
        idx = mp_js_hal_filesystem_create(name, name_len);
    } else {
        idx = mp_js_hal_filesystem_find(name, name_len);
        if (idx < 0) {
            // File not found.
            return NULL;
        }
    }

    mbfs_file_obj_t *res = m_new_obj(mbfs_file_obj_t);
    if (binary) {
        res->base.type = &uos_mbfs_fileio_type;
    } else {
        res->base.type = &uos_mbfs_textio_type;
    }
    res->idx = idx;
    res->writable = write;
    res->open = true;
    res->binary = binary;
    return res;
}

/******************************************************************************/
// Import and reader interface

mp_import_stat_t mp_import_stat(const char *path) {
    int idx = mp_js_hal_filesystem_find(path, strlen(path));
    if (idx < 0) {
        return MP_IMPORT_STAT_NO_EXIST;
    } else {
        return MP_IMPORT_STAT_FILE;
    }
}

STATIC mp_uint_t file_readbyte(void *self_in) {
    mbfs_file_obj_t *self = self_in;
    int chr = mp_js_hal_filesystem_readbyte(self->idx, self->offset);
    if (chr < 0) {
        return MP_READER_EOF;
    }
    self->offset += 1;
    return chr;
}

STATIC void file_close(void *self_in) {
    mbfs_file_obj_t *self = self_in;
    self->open = false;
}

mp_lexer_t *mp_lexer_new_from_file(const char *filename) {
    mbfs_file_obj_t *file = microbit_file_open(filename, strlen(filename), false, false);
    if (file == NULL) {
        mp_raise_OSError(MP_ENOENT);
    }
    mp_reader_t reader;
    reader.data = file;
    reader.readbyte = file_readbyte;
    reader.close = file_close;
    return mp_lexer_new(qstr_from_str(filename), reader);
}

/******************************************************************************/
// Built-in open function

mp_obj_t mp_builtin_open(size_t n_args, const mp_obj_t *args, mp_map_t *kwargs) {
    (void)kwargs;

    /// -1 means default; 0 explicitly false; 1 explicitly true.
    int read = -1;
    int text = -1;
    if (n_args == 2) {
        size_t len;
        const char *mode = mp_obj_str_get_data(args[1], &len);
        for (mp_uint_t i = 0; i < len; i++) {
            if (mode[i] == 'r' || mode[i] == 'w') {
                if (read >= 0) {
                    goto mode_error;
                }
                read = (mode[i] == 'r');
            } else if (mode[i] == 'b' || mode[i] == 't') {
                if (text >= 0) {
                    goto mode_error;
                }
                text = (mode[i] == 't');
            } else {
                goto mode_error;
            }
        }
    }
    size_t name_len;
    const char *filename = mp_obj_str_get_data(args[0], &name_len);
    mbfs_file_obj_t *res = microbit_file_open(filename, name_len, read == 0, text == 0);
    if (res == NULL) {
        mp_raise_OSError(MP_ENOENT);
    }
    return res;

mode_error:
    mp_raise_ValueError(MP_ERROR_TEXT("illegal mode"));
}
MP_DEFINE_CONST_FUN_OBJ_KW(mp_builtin_open_obj, 1, mp_builtin_open);

#endif // MICROPY_MBFS
