import Model from '@expressive/react';
import { Button } from 'common/button/Button';
import { Button } from 'components/button/Button';
import { InputDigits } from 'components/input/digits/Input';
import { Input } from 'components/input/Input';
import { Window } from 'components/window';
import { Countdown } from 'lib/Countdown';
import { Link } from 'react-router-dom';

import { CaretRight } from './chevron.svg';
import { Page, Sub } from './components';
import { Grid } from './Grid';
import spinner from './Spinner.module.css';
import { Table } from './Table';
import TailSpin from './tailspin.svg';

/** @type {React.FC} */
const Wizard = () => {
  <Window>
    <Page>
      {/* <Progress label="Account Setup" steps={5} done={1} /> */}
      <CreateAccount />
    </Page>
  </Window>
}

export default Wizard;

const CreateAccount = () => {
  display: flex;
  flexDirection: column;
  gap: 10;

  inputs: {
    margin: 20;
    display: flex;
    flexDirection: column;
    gap: 10;
  }

  a: {
    color: $accent;
    textDecoration: none;
  }

  already: {
    marginT: 10;
  }

  agree: {
    fontSize: 0.8;
    marginT: 10;
  }

  Button: {
    alignSelf: center;
    width: 240;
  }

  <this>
    <Header>Create an account for free</Header>
    <Sub>FREE forever. No payment needed.</Sub>
    <inputs>
      <Input required prefix="expera.co/" placeholder="Username" />
      <Input required placeholder="Email" />
      <Input required prefix="+1" placeholder="Phone number" />
    </inputs>
    <p agree>
      By creating an account you agree to our <a href="#">Terms and Conditions</a>
    </p>
    <Button text="Continue" />
    <a already href="#">Already have an account?</a>
  </this>
}

const VerifyPhone = () => {
  <this>
    <Header>Verify your phone number</Header>
    <Sub>We've sent a code to your phone number.</Sub>
    <InputDigits />
    <Button text="Continue" />
    <ResendCode />
  </this>
}

const ResendCode = ({ onClick }) => {
  const { seconds } = Countdown.use({ seconds: 60 });

  marginT: 10;
  fontSize: 0.9;

  a: {
    color: $accent;
    textDecoration: none;
  }

  span: {
    color: $textGrey;
    fontWeight: 400;
  }

  <this onClick={() => {
    if(seconds <= 0)
      onClick();
  }}>
    <a already href="#">Resend Code</a> 
    {seconds > 0 && (
      <span>after {seconds} seconds</span>
    )}
  </this>
}

const Setup1 = () => {
  outline: red;
  margin: 0, auto;
  minWidth: 400;
  display: flex;
  flexDirection: column;
  alignItems: stretch;
  justifyContent: center;
  textAlign: center;
  gap: 5.0;

  ProgressButtons: {
    marginT: 10;
  }

  <this>
    <Header>Tell us about yourself</Header>
    <Sub>We'll need some info to build your profile.</Sub>
    <Input required placeholder="Username" />
    <ProgressButtons />
  </this>
}

const ProgressButtons = () => {
  display: flex;
  alignItems: center;
  justifyContent: center;
  gap: 10;
  
  Button: {
    radius: 10;
    fontSize: 1.0;
    padding: 1.0, 2.4;
    maxWidth: 150;
    flex: 1;
  }

  <this>
    <Button secondary disabled text="Go back" />
    <Button text="Continue" />
  </this>
}

export function Switch({ checked, onClick }){
  color: $accent;
  fontSize: 20;
  radius: "round";
  cursor: pointer;
  background: currentColor;
  boxSizing: 'border-box';
  display: 'inline-block';
  opacity: 1;
  userSelect: none;
  transition: "background-color 0.2s ease 0s";
  padding: 1;

  if(!checked)
    background: $borderGrey;

  inner: {
    width: 1.6;
    height: 1.0;
    position: relative;
    radius: round;

    if(!checked)
      background: white;
  }

  innerButton: {
    background: white;
    radius: round;
    shadow: "rgba(0, 0, 0, 0.4)", 3, 0, 1;
    display: block;
    size: 1.0;
    absolute: 'top-left';
    transition: "left 0.2s ease 0s";
  
    if(checked){
      left: 0.6
    }
  }

  <this onClick={onClick}>
    <inner>
      <innerButton />
    </inner>
  </this>
}

export const Instructions = () => {
  margin: 0, auto;
  padding: 0, 30;
  maxWidth: 800;
  color: 0x555;
  lineHeight: 1.5;

  note: {
    background: 0xeee;
    margin: 2.0, 0;
    padding: 15, 20;
    radius: 5;
  }

  Button: {
    margin: 50, auto;

    Link: {
      color: white, !important;
      textDecoration: none;
    }
  }

  <this>
    <section>
      <h3>Instructions</h3>
      Hang on to this page for your records!

      <section>
        <h4>1. Complete the application</h4>
        All questions on this application must be answered.
        If a question does not apply to your situation, please answer “N/A” (not applicable.)
        If you need more space, please attach additional pages.
        Incomplete applications will be returned.
      </section>

      <section>
        <h4>2. Attach Supporting Documents</h4>
        Attach copies of any documents that support your claim for reimbursement.
        Proof of all amounts paid to the attorney or received by the attorney on your behalf is required
        ( i.e. front and back of cancelled checks, payment receipts, billing statements, fee agreements, settlement documents or checks, etc.)
        PLEASE DO NOT SEND ORIGINALS.
      </section>

      <section>
        <h4>3. Notarize and Submit</h4>
        Sign and date the application in the presence of a notary and return it with your supporting documentation to:
        The Lawyers’ Fund for Client Protection, Thomas J. Moyer Ohio Judicial Center, 65 S. Front Street, 5th Floor, Columbus, Ohio, 43215-3431. 
        <b> Applications that have not been notarized will not be accepted and will be returned.</b>
      </section>

      <section>
        <h4>Notice to Claimants:</h4>
        To be eligible for reimbursement from the fund, the lawyer involved in your claim must be suspended, reprimanded, disbarred, convicted, have resigned, or be deceased.
        Reimbursement is limited to money or property paid to or received by your lawyer. Damages or other types of losses are not reimbursable.
        Reimbursement from the Lawyers’ Fund for Client Protection is within the sole discretion of the Board of Commissioners and not as a matter of right.
        The maximum amount of reimbursement for any claim is $100,000. The Lawyers’ Fund for Client Protection is separate from the lawyer discipline process.
        If you have not already done so, you may want to contact your local bar association or The Office of Disciplinary Counsel at 1-800-589-5256 to file a disciplinary grievance against the lawyer involved in your claim.
      </section>

      <section>
        <h4>Notice to Lawyers Assisting Claimants with LFCP Claims:</h4>
        Section 6 (B) of Rule VIII of the Supreme Court Rules for the Government of the Bar provides
        “No attorney fees may be paid from the proceeds of an award made to a claimant under authority of this rule.
        The Board may allow an award of attorney fees to be paid out of the fund if it determines that the attorney’s
        services were necessary to prosecute a claim under this rule or upon other conditions as the Board may direct.”
        Board Rule 14 permits payment of attorney fees up to a maximum of $500.
      </section>

      <section note>
        Please save this page for your records. Keep it accessible for future reference as it contains important details about your application.
      </section>

      <Button>
        <Link to="./step/1">
          I have Read and Understood
        </Link>
      </Button>
    </section>
  </this>;
};

/** @type {React.FC<Model.Props<FullScreen>>} */
export const InputModal = ({ className, children, ...rest }) => {
  screen: {
    position: fixed;
    top: 0;
    left: 0;
    width: '100vw';
    height: '100vh';
    background: 'gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.5))';
    display: flex;
    justifyContent: center;
    alignItems: center;
    zIndex: 1000;
  }

  inner: {
    background: white;
    shadow: 0xccc;
    borderRadius: 10;
    padding: 20;
    size: 500;
  }

  <FullScreen screen {...rest}>
    <inner className={className}>
      {children}
    </inner>
  </FullScreen>
}

export const ProgressBar = ({ fill2, fill, steps }) => {
  $colorOff: $primaryGrey;
  $colorPartial: $darken;

  height: 3;
  position: relative;
  background: $colorOff;
  radius: round;

  Bar: {
    absolute: fill;

    complete: {
      color: $colorPartial;
    }

    position: {
      zIndex: 2;
    }
  }

  <this>
    <Bar position steps={steps} done={fill} />
    {typeof fill2 == 'number' && 
      <Bar complete steps={steps} done={fill2} />
    }
  </this>
}

const Bar = ({ steps, done }) => {
  const percentOffset = Math.min(done / steps, 1) * 100 - 100;

  position: absolute;
  overflow: hidden;
  radius: 3;
  
  complete: {
    absolute: fill;
    background: currentcolor;
    transform: `translateX(var(--fill-offset))`;
    transition: "transform 0.15s cubic-bezier(.09,.87,.63,.97)";
    radius: round;
    // boxShadow: '5px', 0, '5px', '1px', $shadowBlack;
  }

  <this style={{
    "--fill-offset": `${percentOffset}%`
  }}>
    <complete />
  </this>
}

export const Progress = ({ steps, done, label }) => {
  color: $primaryPurple;

  header: {
    display: flex;
    justifyContent: 'space-between';
    fontSize: 0.9;
    marginBottom: 1.0;
  }

  ProgressBar: {
    height: 5;
    color: $primaryPurple;
    $colorOff: $lightGrey;
  }

  <this>
    <header>
      <div>{label}</div>
      <div>Step {done} of {steps}</div>
    </header>
    <ProgressBar fill={done} fill2={done + 1} steps={steps} />
  </this>
}

export function Arrow({ left, onClick }) {
  CaretRight: {
    size: 22;
    cursor: pointer;
    radius: 8;
    border: transparent;
    transition: "background-color 0.1s ease-in-out";

    if (":hover")
      backgroundColor: $secondaryPurple;

    if (!onClick)
      opacity: 0.2;

    if (left) {
      transform: "rotate(180deg)";
    }
  }

  <CaretRight onClick={onClick} />;
}

export const Status = ({ children }) => {
  display: flex;
  alignItems: center;
  fontSize: 12;
  $backgroundColor: currentColor;
  $backgroundOpacity: 0.1;

  inner: {
    radius: round;
    padding: 3, 10;
    color: currentColor;
    border: currentColor;
    textAlign: center;
    position: relative;
    overflow: hidden;
    textOverflow: ellipsis;

    tint: {
      absolute: fill;
      background: $backgroundColor;
      opacity: $backgroundOpacity;
    }
  }

  <this>
    <inner>
      {children}
      <tint />
    </inner>
  </this>
}

export const Spinner = () => {
  <TailSpin this className={spinner.rotating} />
}

export const PleaseHold = ({ children, text }) => {
  const content = children || text;

  flexAlign: center, down;
  $spinColor: currentColor;
  color: $textLight;
  flex: 1;

  Spinner: {
    color: $spinColor;
    fontSize: 3.0;
    marginB: 20;
  }

  <this>
    <Spinner />
    {content}
  </this>
}

/** @type {React.FC} */
export const FullScreen = () => {
  height: $vh;

  <PleaseHold this />
}

/** @type React.FC<Grid.BodyProps> */
export const Body = ({ header, children }) => {
  const { before } = Table.get();
  
  radius: 8;
  border: 0xeee;
  overflow: auto;
  font: 13;

  table: {
    borderCollapse: separate;
    borderSpacing: 0;
    minWidth: fill;
  }

  <this>
    {before}
    <table>
      {header}
      <tbody>
        {children}
      </tbody>
    </table>
  </this>
};

/** @type React.FC<Grid.HeaderProps> */
export const Header = ({ children }) => {
  padding: 0, "1em";
  backgroundColor: 0xf3f4f6;
  zIndex: 1;
  position: sticky;
  top: 0;

  <thead this>
    <tr>
      {children}
    </tr>
  </thead>
}

/** @type React.FC<Grid.HeadProps> */
export const Head = ({ column }) => {
  padding: '1em';
  textAlign: left;
  fontWeight: 500;
  color: 0x4b5563;
  overflow: hidden;
  textOverflow: ellipsis;
  whiteSpace: nowrap;

  <th this />
}

/** @type React.FC<Grid.RowProps> */
export const Row = ({ data }) => {
  borderBottom: 0xe5e7eb;
  backgroundColor: 0xffffff;
  transition: 'background-color 0.2s';
  padding: 0, "1em";

  if(":hover")
    backgroundColor: 0xf9fafb;

  <tr this />
}

/** @type React.FC<Grid.CellProps> */
export const Cell = ({ column, data }) => {
  padding: "1em";
  color: 0x4b5563;
  borderTop: 0xeee;
  borderBottom: none;
  overflow: hidden;

  <td this />
}