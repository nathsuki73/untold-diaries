import type { NextApiRequest, NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";

const verifyCaptcha = async (token: string): Promise<boolean> => {
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${process.env.TURNSTILE_SECRET_KEY}&response=${token}`,
    }
  );

  const data = await res.json();
  return data.success;
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, message, captcha } = body;

  if (!captcha) {
    return NextResponse.json(
      { message: "Captcha token is missing" },
      { status: 400 }
    );
  }

  const captchaValid = await verifyCaptcha(captcha);

  if (!captchaValid) {
    return NextResponse.json(
      { message: "Captcha verification failed" },
      { status: 403 }
    );
  }

  console.log("Form submission passed captcha:", { name, message });

  return NextResponse.json({ message: "Form submitted successfully" });
}

//This code is moved to python backend
