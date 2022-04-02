const express = require("express");
const mongoose = require("mongoose");
const {Op} = require("sequelize");
const Joi = require("joi");
const {User} = require("./models");
const jwt = require("jsonwebtoken");
const authMiddleware = require("./middlewares/auth-middleware");
const res = require("express/lib/response");

mongoose.connect("mongodb://localhost/shopping-demo", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));

const app = express();
const router = express.Router();

const postUsersSchema = Joi.object({
    nickname: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    confirmPassword: Joi.string().required(),
});
//회원가입 API
router.post("/users", async (req, res) => {

    try {
        const { nickname, email, password, confirmPassword } = await postUsersSchema.validateAsync(req.body);
    // 비밀번호와 확인비밀번호가 일치하지않을 경우에 400 bad request를 날려주고 에러메세지 송출, 다음으로 진행되지 않기 위해서 returnd으로 막아준다.
    if (password !== confirmPassword ) {
        res.status(400).send({
            errorMessage: '패스워드가 일치하지 않습니다.',
        });
        return; // return 을 하지않으면 패스워드가 다르더라도 그냥 다음 코드가 실행이 되어버린다. 예외를 줄여나가기 위한것이다.
    }
    // 회원가입시 닉네임과 이메일을 find로 또는 으로 받아온다.
    const existUser = await User.findAll({
        where: {
            [Op.or]: [{nickname}, {email}],
        },
    });
    // 만약 닉네임, 이메일이 겹치는것이 있으면 bad request인 400을 주고 에러 메세지를 날려준다. 다음으로 진행되지 않기 위해서 returnd으로 막아준다.
    if (existUser.length) {
        res.status(400).send({
            errorMessage: "이미 가입된 이메일 또는 닉네임이 있습니다.",
        });
        return;
    }
    // 위쪽에서 의 조건을 다 만족하면 데이터베이스에 사용자 정보를 저장해도 괜찮기 때문에 데이터베이스에 필요한 것들만 저장을 해줌
    await User.create({email, nickname, password});
    // user의 정보를 확실하게 저장을 해주는 것
    // await user.save();
    // 응답값을 줘야함 기본적으로 200의 성공 코드가 넘어가므로 문제가 없다. 하지만 회원가입 creat는 rest API에 의해서 201 코드를 주는게 적합하다.
    res.status(201).send({});
    } catch (error) {
        res.status(400).send({
            errorMessage: "요청한 형식이 올바르지 않습니다."
        })
    }
});

// 로그인 API
const postAuthSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

router.post("/auth", async (req, res) => {
    
    // try {
        const {email, password} = await postAuthSchema.validateAsync(req.body);

        const user = await User.findOne({ where: { email, password}});

        if (!user) {
            res.status(400).send({
                errorMessage: "이메일 또는 패스워드가 잘못 됐습니다~"
            });
            return;
        }

        const token = jwt.sign({ userId: user.userId}, "my-secret-key");
        res.send({
            token,
        });
    // } catch (error) {
        // console.log(error)
        // res.status(400).send({
        //     errorMessage: "요청한 데이터 형식이 틀렸어!!!"
        // });
    // }
    
});

router.get("/users/me", authMiddleware, async (req, res) => {
    const { user} = res.locals;
    res.send({
        user,
    });
});

app.use("/api", express.urlencoded({ extended: false }), router);
app.use(express.static("assets"));

app.listen(8080, () => {
  console.log("서버가 요청을 받을 준비가 됐어요");
});