import express from 'express'
import { createClient } from 'redis'
import CORS from 'cors'

const app = express()

app.use(CORS())

app.use(express.static('public'))

async function connect_db() {
    const client = createClient({ url: 'redis://db-redis:6379' })
    try {
        await client.connect()
    } catch (err) {
        console.log('Error al conectarse a la base de datos ' + err)
    }
    return client
}

async function cargar_datos() {
    const client = await connect_db()
    const size = await client.dbSize()
    if (size === 0) {
        await client.geoAdd('Cervecerías artesanales', [
            {
                member: 'Lagash',
                longitude: -58.24832,
                latitude: -32.47727,
            },
            {
                member: 'Drakkar',
                longitude: -58.23392,
                latitude: -32.48051,
            },
            {
                member: 'Bigua',
                longitude: -58.2708,
                latitude: -32.48636,
            },
            {
                member: 'Tractor',
                longitude: -58.23793,
                latitude: -32.48102,
            },
            {
                member: '7 Colinas',
                longitude: -58.23521,
                latitude: -32.47983,
            },
            {
                member: 'Ambar',
                longitude: -58.23272,
                latitude: -32.482,
            },
        ])

        await client.geoAdd('Universidades', [
            {
                member: 'UADER - FCyT',
                longitude: -58.23357,
                latitude: -32.47895,
            },
            {
                member: 'UTN - FRCU',
                longitude: -58.22962,
                latitude: -32.49555,
            },
            {
                member: 'UNER - FCS',
                longitude: -58.26128,
                latitude: -32.48042,
            },
            {
                member: 'UCU',
                longitude: -58.22966,
                latitude: -32.48147,
            },
            {
                member: 'UADER - FCG',
                longitude: -58.23376,
                latitude: -32.48449,
            },
        ])

        await client.geoAdd('Farmacias', [
            {
                member: 'Farmacia pildora',
                longitude: -58.25049,
                latitude: -32.48488,
            },
            {
                member: 'Farmacia Argentina',
                longitude: -58.23442,
                latitude: -32.48552,
            },
            {
                member: 'Farmacia Flores',
                longitude: -58.23045,
                latitude: -32.48957,
            },
            {
                member: 'Farmacia Jardin',
                longitude: -58.23655,
                latitude: -32.47971,
            },
            {
                member: 'Farmacia Don Bosco',
                longitude: -58.23307,
                latitude: -32.48371,
            },
            {
                member: 'Farmacia Alberdi',
                longitude: -58.23276,
                latitude: -32.48606,
            },
            {
                member: 'Farmacia del pueblo',
                longitude: -58.2284,
                latitude: -32.4823,
            },
        ])

        await client.geoAdd('Centro de atención de emergencias', [
            {
                member: 'CAPS Villa Las Lomas Norte',
                longitude: -58.2523,
                latitude: -32.483,
            },
            {
                member: 'Centro Médico',
                longitude: -58.23663,
                latitude: -32.47899,
            },
            {
                member: 'Centro de Medicina Respiratoria',
                longitude: -58.22515,
                latitude: -32.48106,
            },
            {
                member: 'Alerta Emergencias Cardiomedicas',
                longitude: -58.23663,
                latitude: -32.48362,
            },
            {
                member: 'Centro de Saludo Dr. Giacomotti',
                longitude: -58.23531,
                latitude: -32.47073,
            },
        ])

        await client.geoAdd('Supermecados', [
            {
                member: 'Supermercado Natalia',
                longitude: -58.25661,
                latitude: -32.48729,
            },
            {
                member: 'DIA',
                longitude: -58.24186,
                latitude: -32.4882,
            },
            {
                member: 'Gran Rex',
                longitude: -58.2362,
                latitude: -32.48605,
            },
            {
                member: 'DAR Supremo',
                longitude: -58.23262,
                latitude: -32.48614,
            },
            {
                member: 'DIA',
                longitude: -58.22797,
                latitude: -32.38062,
            },
        ])
    }
}

app.get('/lugaresCerca', async (req, res) => {
    if (!req.query.latitud || !req.query.longitud) {
        res.sendStatus(400)
        return
    }
    try {
        const client = await connect_db()

        const lugares = await Promise.all([
            client.geoRadius(
                'Cervecerías artesanales',
                { latitude: req.query.latitud, longitude: req.query.longitud },
                5,
                'km'
            ),
            client.geoRadius('Universidades', { latitude: req.query.latitud, longitude: req.query.longitud }, 5, 'km'),
            client.geoRadius('Farmacias', { latitude: req.query.latitud, longitude: req.query.longitud }, 5, 'km'),
            client.geoRadius(
                'Centro de atención de emergencias',
                { latitude: req.query.latitud, longitude: req.query.longitud },
                5,
                'km'
            ),
        ])

        res.send([
            ...lugares[0].map((l) => ({ name: l, type: 'Cervecerías artesanales' })),
            ...lugares[1].map((l) => ({ name: l, type: 'Universidades' })),
            ...lugares[2].map((l) => ({ name: l, type: 'Farmacias' })),
            ...lugares[3].map((l) => ({ name: l, type: 'Centro de atención de emergencias' })),
        ])
    } catch (err) {
        res.status(500).send({
            message: 'ERROR',
            error: err,
        })
    }
})

app.get('/distancia', async (req, res) => {
    if (!req.query.nombre || !req.query.tipo || !req.query.latitud || !req.query.longitud) {
        res.sendStatus(400)
        return
    }
    try {
        const client = await connect_db()

        // agregamos temporalmente la ubicacion del usuario para poder calcular la distancia
        await client.geoAdd(req.query.tipo, {
            member: 'usuario',
            longitude: req.query.longitud,
            latitude: req.query.latitud,
        })

        const distancia = await client.geoDist(req.query.tipo, 'usuario', req.query.nombre, 'm')

        await client.zRem(req.query.tipo, 'usuario')

        res.send({ distancia: distancia })
    } catch (err) {
        res.status(500).send({
            message: 'ERROR',
            error: err,
        })
    }
})

app.get('/cargarLugar', async (req, res) => {
    if (!req.query.nombre || !req.query.longitud || !req.query.latitud || !req.query.grupo) {
        res.sendStatus(400)
        return
    }
    try {
        const client = await connect_db()

        await client.geoAdd(req.query.grupo, {
            member: req.query.nombre,
            longitude: req.query.longitud,
            latitude: req.query.latitud,
        })

        res.sendStatus(200)
    } catch (err) {
        res.status(500).send({
            message: 'ERROR',
            error: err,
        })
    }
})

app.listen(3000, async () => {
    console.log('Servidor corriendo en el puerto 3000')
    await cargar_datos()
})
