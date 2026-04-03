

import React from 'react'

export const pageSizes = {
    A4: { width: 210, height: 297 }, // mm
    A3: { width: 297, height: 420 },
    A5: { width: 148, height: 210 },
    Letter: { width: 215.9, height: 279.4 },
    Legal: { width: 215.9, height: 355.6 },
};
export type PaperSize = keyof typeof pageSizes;
