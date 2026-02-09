import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

export const sendCredentialsEmail = async (to: string, nombre: string, clave: string) => {
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: to,
            subject: 'Credenciales de Acceso - Sistema de Titulación UIDE',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h2 style="color: #d32f2f; text-align: center;">Bienvenido al Sistema de Titulación</h2>
                    <p>Estimado(a) <strong>${nombre}</strong>,</p>
                    <p>Se ha creado su cuenta en la plataforma de gestión de titulación de la UIDE.</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Usuario:</strong> ${to}</p>
                        <p style="margin: 5px 0;"><strong>Contraseña:</strong> ${clave}</p>
                    </div>
                    <p>Por favor, ingrese al sistema y cambie su contraseña lo antes posible por seguridad.</p>
                    <a href="http://localhost:5173/login" style="display: block; width: fit-content; margin: 20px auto; padding: 10px 20px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 5px;">Ingresar al Sistema</a>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #757575; text-align: center;">Este es un mensaje automático, por favor no responder.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Correo enviado a ${to}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Error enviando correo:', error);
        return false;
    }
};

export const sendPlatformAccessEmail = async (to: string, nombre: string) => {
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: to,
            subject: 'Acceso Habilitado - Sistema de Titulación UIDE',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h2 style="color: #2e7d32; text-align: center;">¡Acceso Habilitado!</h2>
                    <p>Estimado(a) <strong>${nombre}</strong>,</p>
                    <p>Nos complace informarle que ha cumplido con todos los prerrequisitos necesarios.</p>
                    <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #2e7d32;">
                        <p style="margin: 0; color: #1b5e20;">Su cuenta ha sido habilitada para crear y gestionar su propuesta de titulación en la plataforma.</p>
                    </div>
                    <p>Ya puede acceder a todas las funcionalidades del sistema.</p>
                    <a href="http://localhost:5173/login" style="display: block; width: fit-content; margin: 20px auto; padding: 10px 20px; background-color: #2e7d32; color: white; text-decoration: none; border-radius: 5px;">Ir a la Plazaforma</a>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #757575; text-align: center;">Sistema de Gestión de Titulación UIDE</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Correo de habilitación enviado a ${to}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Error enviando correo de habilitación:', error);
        return false;
    }
};

export const sendProposalsCompletedEmail = async (to: string, nombreDirector: string, nombreEstudiante: string) => {
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: to,
            subject: 'Nuevas Propuestas de Titulación - UIDE',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h2 style="color: #1565c0; text-align: center;">Propuestas Completadas</h2>
                    <p>Estimado(a) <strong>${nombreDirector}</strong>,</p>
                    <p>El estudiante <strong>${nombreEstudiante}</strong> ha completado el envío de sus 3 propuestas de titulación.</p>
                    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #1565c0;">
                        <p style="margin: 0; color: #0d47a1;">Las propuestas están listas para su revisión en la plataforma.</p>
                    </div>
                    <a href="http://localhost:5173/director/proposals" style="display: block; width: fit-content; margin: 20px auto; padding: 10px 20px; background-color: #1565c0; color: white; text-decoration: none; border-radius: 5px;">Revisar Propuestas</a>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #757575; text-align: center;">Sistema de Gestión de Titulación UIDE</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Correo de notificación enviado a ${to}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Error enviando correo de notificación:', error);
        return false;
    }
};

export const sendDefenseNotificationEmail = async (params: {
    to: string,
    nombre: string,
    rol: string,
    estudianteNombre?: string,
    tema: string,
    fecha: string,
    hora: string,
    aula: string,
    tipo: 'Privada' | 'Pública'
}) => {
    const { to, nombre, rol, estudianteNombre, tema, fecha, hora, aula, tipo } = params;
    try {
        const isStudent = rol === 'ESTUDIANTE' || rol === 'Estudiante';
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: to,
            subject: `Notificación de Defensa ${tipo} - Sistema de Titulación UIDE`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h2 style="color: #c62828; text-align: center;">Notificación de Defensa ${tipo}</h2>
                    <p>Estimado(a) <strong>${nombre}</strong>,</p>
                    <p>Se le informa que se ha programado una <strong>Defensa ${tipo}</strong> con los siguientes detalles:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #c62828;">
                        ${!isStudent && estudianteNombre ? `<p style="margin: 5px 0;"><strong>Estudiante:</strong> ${estudianteNombre}</p>` : ''}
                        <p style="margin: 5px 0;"><strong>Tema:</strong> ${tema}</p>
                        <p style="margin: 5px 0;"><strong>Rol:</strong> ${rol}</p>
                        <p style="margin: 5px 0;"><strong>Fecha:</strong> ${fecha}</p>
                        <p style="margin: 5px 0;"><strong>Hora:</strong> ${hora}</p>
                        <p style="margin: 5px 0;"><strong>Aula:</strong> ${aula}</p>
                    </div>
                    
                    <p>Por favor, sea puntual y asegúrese de contar con todos los materiales necesarios para el evento.</p>
                    
                    <a href="http://localhost:5173/login" style="display: block; width: fit-content; margin: 20px auto; padding: 10px 20px; background-color: #c62828; color: white; text-decoration: none; border-radius: 5px;">Acceder al Sistema</a>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #757575; text-align: center;">Este es un mensaje automático del Sistema de Gestión de Titulación UIDE.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Correo de defensa enviado a ${to}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Error enviando correo de defensa:', error);
        return false;
    }
};
