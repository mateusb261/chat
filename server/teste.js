const nodemailer = require("nodemailer");

async function sendEmail(to, code) {
    const transporter = nodemailer.createTransport({
        service: "gmail", // ou outro serviço como Outlook, Yahoo, etc.
        auth: {
            user: "exemploemail@gmail.com", // seu e-mail
            pass: "", // sua senha ou app password
        },
    });

    const mailOptions = {
        from: "exemploemail@gmail.com",
        to: to,
        subject: "Seu código de verificação",
        text: `Seu código de verificação é: ${code}`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("E-mail enviado: " + info.response);
    } catch (error) {
        console.error("Erro ao enviar e-mail:", error);
    }
}

// Exemplo de uso:
sendEmail("destinatario@gmail.com", "123456");
