const nodemailer = require("nodemailer");

async function sendEmail(to, code) {
    const transporter = nodemailer.createTransport({
        service: "gmail", // ou outro serviço como Outlook, Yahoo, etc.
        auth: {
            user: "mateusbastos261@gmail.com", // seu e-mail
            pass: "tytn uwcy gmjj fvqb", // sua senha ou app password
        },
    });

    const mailOptions = {
        from: "mateusbastos261@gmail.com",
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
sendEmail("mbmm.snf22@uea.edu.br", "123456");
