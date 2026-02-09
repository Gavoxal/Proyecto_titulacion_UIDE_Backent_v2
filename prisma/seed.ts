import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...\n');

    // Password hash
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Limpiar base de datos (Orden específico por FKs)
    console.log('🗑️ Cleaning up database...');
    try {
        // Nivel 4 (Dependencias de Actividad/Propuesta profunda)
        await prisma.comentario.deleteMany({});
        await prisma.evidencia.deleteMany({});

        // Nivel 3 (Dependencias de Propuesta)
        await prisma.actividad.deleteMany({});
        await prisma.trabajoTitulacion.deleteMany({});
        await prisma.comite.deleteMany({});
        await prisma.entregableFinal.deleteMany({});
        await prisma.bitacoraReunion.deleteMany({});
        await prisma.votacionTutor.deleteMany({});

        // Nivel 2 (Propuesta y Prerequisitos)
        await prisma.propuesta.deleteMany({});
        await prisma.estudiantePrerequisito.deleteMany({});
        await prisma.catalogoPrerequisito.deleteMany({});

        // Nivel 1 (Usuarios y Perfiles)
        await prisma.auth.deleteMany({});
        await prisma.estudiantePerfil.deleteMany({});
        await prisma.usuario.deleteMany({});
        await prisma.areaConocimiento.deleteMany({});

        console.log('✨ Database clean');
    } catch (e) {
        console.log('⚠️ Cleanup warning (ignore if empty):', e);
    }

    // 1. ÁREAS DE CONOCIMIENTO
    console.log('📚 Creating Áreas de Conocimiento...');

    // Lista actualizada de áreas
    const areas = [
        { codigo: 'DATA-IA', nombre: 'Ciencia de Datos e Inteligencia Artificial', descripcion: 'Ciencia de datos, IA y Machine Learning' },
        { codigo: 'GESTION-DIGITAL', nombre: 'Gestión de la Información y Transformación Digital', descripcion: 'Gestión de TI y transformación digital' },
        { codigo: 'INFRA-SEC', nombre: 'Infraestructura TI y Ciberseguridad', descripcion: 'Redes, infraestructura y seguridad informática' },
        { codigo: 'INNOV-ETICA', nombre: 'Innovación, Emprendimiento y Ética Tecnológica', descripcion: 'Innovación tecnológica y ética' },
        { codigo: 'DEV-SOFT', nombre: 'Programación y Desarrollo de Software', descripcion: 'Desarrollo de software y aplicaciones' },
    ];

    const createdAreas = [];
    for (const area of areas) {
        createdAreas.push(await prisma.areaConocimiento.create({ data: area }));
    }
    const areaId1 = createdAreas[0].id;
    const areaId2 = createdAreas[1].id;
    const areaId3 = createdAreas[2].id;

    console.log(`✅ Created ${areas.length} áreas\n`);

    // 2. PRERREQUISITOS
    console.log('📋 Creating Prerrequisitos...');

    // Limpiar base de datos (Orden específico por FKs)
    console.log('🗑️ Cleaning up database...');
    try {
        // Nivel 4 (Dependencias de Actividad/Propuesta profunda)
        await prisma.comentario.deleteMany({});
        await prisma.evidencia.deleteMany({});

        // Nivel 3 (Dependencias de Propuesta)
        await prisma.actividad.deleteMany({});
        await prisma.trabajoTitulacion.deleteMany({});
        await prisma.comite.deleteMany({});
        await prisma.entregableFinal.deleteMany({});
        await prisma.bitacoraReunion.deleteMany({});
        await prisma.votacionTutor.deleteMany({});

        // Nivel 2 (Propuesta y Prerequisitos)
        await prisma.propuesta.deleteMany({});
        await prisma.estudiantePrerequisito.deleteMany({});
        await prisma.catalogoPrerequisito.deleteMany({});

        // Nivel 1 (Usuarios y Perfiles)
        await prisma.auth.deleteMany({});
        await prisma.estudiantePerfil.deleteMany({});
        await prisma.usuario.deleteMany({});
        await prisma.areaConocimiento.deleteMany({});

        console.log('✨ Database clean');
    } catch (e) {
        console.log('⚠️ Cleanup warning (ignore if empty):', e);
    }

    const prereq1 = await prisma.catalogoPrerequisito.create({
        data: {
            nombre: 'Suficiencia de Inglés', // CAMBIO IMPORTANTE
            descripcion: 'Certificado de suficiencia B1 o superior',
            activo: true,
            orden: 1
        }
    });

    const prereq2 = await prisma.catalogoPrerequisito.create({
        data: {
            nombre: 'Prácticas Preprofesionales',
            descripcion: 'Certificado de cumplimiento de 240 horas',
            activo: true,
            orden: 2
        }
    });

    const prereq3 = await prisma.catalogoPrerequisito.create({
        data: {
            nombre: 'Vinculación con la Sociedad',
            descripcion: 'Certificado de cumplimiento de proyecto de vinculación',
            activo: true,
            orden: 3
        }
    });
    console.log('✅ Created 3 prerrequisitos estandarizados\n');

    // 3. USUARIOS
    console.log('👥 Creating Users...');

    const director = await prisma.usuario.create({
        data: {
            nombres: 'María',
            apellidos: 'González',
            cedula: '1234567890',
            correoInstitucional: 'director@uide.edu.ec',
            rol: 'DIRECTOR',
            auth: {
                create: {
                    username: 'director@uide.edu.ec',
                    password: hashedPassword
                }
            }
        }
    });

    const coordinador = await prisma.usuario.create({
        data: {
            nombres: 'Carlos',
            apellidos: 'Ramírez',
            cedula: '1234567891',
            correoInstitucional: 'coordinador@uide.edu.ec',
            rol: 'COORDINADOR',
            auth: {
                create: {
                    username: 'coordinador@uide.edu.ec',
                    password: hashedPassword
                }
            }
        }
    });

    const tutor1 = await prisma.usuario.create({
        data: {
            nombres: 'Ana',
            apellidos: 'Martínez',
            cedula: '1234567892',
            correoInstitucional: 'tutor1@uide.edu.ec',
            rol: 'TUTOR',
            auth: {
                create: {
                    username: 'tutor1@uide.edu.ec',
                    password: hashedPassword
                }
            }
        }
    });

    const tutor2 = await prisma.usuario.create({
        data: {
            nombres: 'Roberto',
            apellidos: 'López',
            cedula: '1234567893',
            correoInstitucional: 'tutor2@uide.edu.ec',
            rol: 'TUTOR',
            auth: {
                create: {
                    username: 'tutor2@uide.edu.ec',
                    password: hashedPassword
                }
            }
        }
    });

    const tutor3 = await prisma.usuario.create({
        data: {
            nombres: 'Patricia',
            apellidos: 'Sánchez',
            cedula: '1234567894',
            correoInstitucional: 'tutor3@uide.edu.ec',
            rol: 'TUTOR',
            auth: {
                create: {
                    username: 'tutor3@uide.edu.ec',
                    password: hashedPassword
                }
            }
        }
    });

    const docente = await prisma.usuario.create({
        data: {
            nombres: 'Luis',
            apellidos: 'Herrera',
            cedula: '1234567895',
            correoInstitucional: 'docente@uide.edu.ec',
            rol: 'DOCENTE_INTEGRACION',
            auth: {
                create: {
                    username: 'docente@uide.edu.ec',
                    password: hashedPassword
                }
            }
        }
    });

    const comite1 = await prisma.usuario.create({
        data: {
            nombres: 'Elena',
            apellidos: 'Vargas',
            cedula: '1234567896',
            correoInstitucional: 'comite1@uide.edu.ec',
            rol: 'COMITE',
            auth: {
                create: {
                    username: 'comite1@uide.edu.ec',
                    password: hashedPassword
                }
            }
        }
    });

    const comite2 = await prisma.usuario.create({
        data: {
            nombres: 'Jorge',
            apellidos: 'Mendoza',
            cedula: '1234567897',
            correoInstitucional: 'comite2@uide.edu.ec',
            rol: 'COMITE',
            auth: {
                create: {
                    username: 'comite2@uide.edu.ec',
                    password: hashedPassword
                }
            }
        }
    });

    const estudiante1 = await prisma.usuario.create({
        data: {
            nombres: 'Juan',
            apellidos: 'Pérez',
            cedula: '1234567898',
            correoInstitucional: 'estudiante1@uide.edu.ec',
            rol: 'ESTUDIANTE',
            auth: {
                create: {
                    username: 'estudiante1@uide.edu.ec',
                    password: hashedPassword
                }
            },
            estudiantePerfil: {
                create: {
                    escuela: 'Ingeniería en Sistemas',
                    malla: '2023',
                    sede: 'Quito'
                }
            }
        }
    });

    const estudiante2 = await prisma.usuario.create({
        data: {
            nombres: 'Sofía',
            apellidos: 'Rodríguez',
            cedula: '1234567899',
            correoInstitucional: 'estudiante2@uide.edu.ec',
            rol: 'ESTUDIANTE',
            auth: {
                create: {
                    username: 'estudiante2@uide.edu.ec',
                    password: hashedPassword
                }
            },
            estudiantePerfil: {
                create: {
                    escuela: 'Ingeniería en Sistemas',
                    malla: '2023',
                    sede: 'Quito'
                }
            }
        }
    });

    console.log('✅ Created 2 students with profiles\n');
    console.log('✅ Created Admin/Director/Tutor users (Students creation skipped)\n');

    // 4. PRERREQUISITOS DE ESTUDIANTES
    console.log('✅ Creating Estudiante Prerrequisitos...');
    for (const estudiante of [estudiante1, estudiante2]) {
        for (const prereq of [prereq1, prereq2, prereq3]) {
            await prisma.estudiantePrerequisito.create({
                data: {
                    fkEstudiante: estudiante.id,
                    prerequisitoId: prereq.id,
                    cumplido: Math.random() > 0.5,
                    fechaCumplimiento: new Date()
                }
            });
        }
    }
    console.log('✅ Students have prerequisites\n');

    // 5. PROPUESTAS
    console.log('📄 Creating Propuestas...');
    const propuesta1 = await prisma.propuesta.create({
        data: {
            titulo: 'Sistema Inventario IA',
            objetivos: 'Desarrollar sistema inteligente',
            problematica: 'Dificultad para predecir demanda',
            alcance: 'Sistema web',
            carrera: 'Ingeniería en Sistemas',
            malla: '2023',
            areaConocimientoId: areaId2,
            fkEstudiante: estudiante1.id,
            estado: 'APROBADA'
        }
    });

    const propuesta2 = await prisma.propuesta.create({
        data: {
            titulo: 'App Móvil para Gestión de Citas',
            objetivos: 'Crear app móvil',
            problematica: 'Dificultad en coordinación',
            alcance: 'App móvil',
            carrera: 'Ingeniería en Sistemas',
            malla: '2023',
            areaConocimientoId: areaId1,
            fkEstudiante: estudiante2.id,
            estado: 'APROBADA'
        }
    });

    console.log('✅ Created 2 propuestas\n');
    console.log('✅ Seed completed (Admin/Director/Tutor only)\n');

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATABASE SEED COMPLETED!');
    console.log('='.repeat(60) + '\n');
}

main()
    .catch((e) => {
        console.error('❌ Error during seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
