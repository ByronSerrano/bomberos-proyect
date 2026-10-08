import { z } from 'zod';

export const bboxSchema = z
  .tuple([
    z.number().min(-180).max(180),
    z.number().min(-85).max(85),
    z.number().min(-180).max(180),
    z.number().min(-85).max(85),
  ])
  .refine(
    ([w, s, e, n]) => w < e && s < n && e - w <= 10 && n - s <= 10,
    'Usa oeste,sur,este,norte, con un máximo de 10° por lado.',
  );
export type Bbox = z.infer<typeof bboxSchema>;

export const detectionSchema = z.object({
  id: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  acquiredAt: z.iso.datetime(),
  frp: z.number().nonnegative(),
  confidence: z.enum(['l', 'n', 'h']),
  satellite: z.string(),
  version: z.string(),
  scan: z.number().positive(),
  track: z.number().positive(),
  dayNight: z.enum(['D', 'N']),
});
export type Detection = z.infer<typeof detectionSchema>;
export const datasetSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  bbox: bboxSchema,
  sourceUrl: z.url({ protocol: /^https$/ }),
  documentationUrl: z.url({ protocol: /^https$/ }),
  retrievedAt: z.iso.datetime(),
  sourceSha256: z.string(),
  sourceRows: z.number().int().nonnegative(),
  rejectedRows: z.number().int().nonnegative(),
  duplicatesRemoved: z.number().int().nonnegative(),
  observations: z.array(detectionSchema).max(15000),
});
export type Dataset = z.infer<typeof datasetSchema>;
export const firmsSources = [
  'VIIRS_NOAA20_NRT',
  'VIIRS_NOAA21_NRT',
  'VIIRS_NOAA20_SP',
  'VIIRS_SNPP_SP',
] as const;
export const firmsQuerySchema = z.object({
  bbox: bboxSchema,
  source: z.enum(firmsSources),
  date: z.iso
    .date()
    .refine(
      (value) => value <= new Date().toISOString().slice(0, 10),
      'La fecha no puede ser futura.',
    ),
  days: z.number().int().min(1).max(5),
});
export const eonetResponseSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      link: z.url({ protocol: /^https$/ }),
      geometry: z.array(
        z.object({
          date: z.iso.datetime(),
          type: z.string(),
          coordinates: z.unknown(),
        }),
      ),
    }),
  ),
});
export type NaturalEvent = z.infer<typeof eonetResponseSchema>['events'][number];
