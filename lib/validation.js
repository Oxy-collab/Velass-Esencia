// Validación de entrada con zod: esquemas y middlewares reutilizables.
const { z } = require('zod');

const email = z.string()
    .trim()
    .max(254)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Correo inválido');

const password = z.string().min(1, 'La contraseña es obligatoria').max(200);
const newPassword = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200);

const loginSchema = z.object({
    email,
    password
});

const registerSchema = z.object({
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
    email,
    password: newPassword
});

const passwordChangeSchema = z.object({
    currentPassword: password,
    newPassword
});

const productSchema = z.object({
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(200),
    category: z.string().trim().max(100).optional(),
    description: z.string().max(2000).optional(),
    price: z.coerce.number().finite('Precio inválido').nonnegative('El precio no puede ser negativo'),
    stock: z.coerce.number().int('El stock debe ser entero').min(0, 'El stock no puede ser negativo').optional(),
    discount_price: z.coerce.number()
        .finite('Precio de oferta inválido')
        .nonnegative('El precio de oferta no puede ser negativo')
        .optional()
        .nullable(),
    img: z.string()
        .trim()
        .max(500)
        .refine((value) => value === '' || /^https?:\/\//i.test(value), 'La imagen debe ser una URL http(s) o estar vacía')
        .optional(),
    weight_g: z.coerce.number().int('El peso debe ser un entero (gramos)').min(0).max(100000).optional().nullable(),
    burn_hours: z.coerce.number().int('La duración debe ser un entero (horas)').min(0).max(10000).optional().nullable(),
    wax_type: z.string().trim().max(100).optional().nullable(),
    wick_type: z.string().trim().max(100).optional().nullable(),
    scent_notes: z.string().trim().max(500).optional().nullable(),
    care_instructions: z.string().trim().max(1000).optional().nullable()
}).refine(
    (data) => data.discount_price === undefined || data.discount_price === null || data.discount_price === 0 || data.discount_price < data.price,
    { message: 'El precio de oferta debe ser menor que el precio normal', path: ['discount_price'] }
);

const reviewSchema = z.object({
    author: z.string().trim().min(1, 'El nombre es obligatorio').max(80),
    rating: z.coerce.number().int('La valoración debe ser un entero').min(1, 'La valoración va de 1 a 5').max(5, 'La valoración va de 1 a 5'),
    comment: z.string().trim().min(5, 'El comentario es demasiado corto').max(1000)
});

const transactionSchema = z.object({
    type: z.enum(['ingreso', 'egreso'], { message: 'Tipo inválido' }),
    category: z.string().trim().min(1, 'La categoría es obligatoria').max(100),
    amount: z.coerce.number().finite('Monto inválido').positive('El monto debe ser mayor que cero'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe ser YYYY-MM-DD'),
    description: z.string().max(500).optional()
});

const settingSchema = z.object({
    key: z.string().trim().min(1, 'La clave es obligatoria').max(100),
    value: z.string().max(2000)
});

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'El mes debe ser YYYY-MM');
const idSchema = z.coerce.number().int().positive();

const formatIssues = (error) => error.issues.map((issue) => ({
    campo: issue.path.join('.') || '(body)',
    mensaje: issue.message
}));

// Valida req.body contra el esquema y sustituye el body por los datos saneados
// (los campos desconocidos se descartan).
const validateBody = (schema) => (req, res, next) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
        return res.status(400).json({ error: 'Datos inválidos', details: formatIssues(parsed.error) });
    }
    req.body = parsed.data;
    next();
};

// Valida un parámetro de ruta (req.params[name]).
const validateParam = (name, schema) => (req, res, next) => {
    const parsed = schema.safeParse(req.params[name]);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Parámetro inválido', details: formatIssues(parsed.error) });
    }
    req.params[name] = parsed.data;
    next();
};

module.exports = {
    loginSchema,
    registerSchema,
    passwordChangeSchema,
    productSchema,
    reviewSchema,
    transactionSchema,
    settingSchema,
    monthSchema,
    idSchema,
    validateBody,
    validateParam
};
