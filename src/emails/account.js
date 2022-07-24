const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SG_API_KEY);

const sendWelcomeEmail = (email, name) => {
  sgMail.send({
    to: email,
    from: "anni.aapro@gmail.com",
    subject: "You have been registered to Task App!",
    text: `Hello, ${name}! Thank you for joining in!`,
    //html: "" Html page can be added here
  });
};

const sendGoodbyeEmail = (email, name) => {
  sgMail.send({
    to: email,
    from: "anni.aapro@gmail.com",
    subject: "We are sorry to see you leaving Task App",
    text: `Hello, ${name}! Your Task App account has been removed by your request. Feel feel to tell us why, so we can make our application better in the future!`,
    //html: "" Html page can be added here
  });
};

module.exports = { sendWelcomeEmail, sendGoodbyeEmail };
