import React, { useEffect, useState, useCallback ,useRef} from 'react';
import web3 from './web3';
import lottery from './lottery';
import { Button, Container, Row, Col, Alert, FormControl, InputGroup,Modal  } from 'react-bootstrap';

function App() {
  const [account, setAccount] = useState('');
  const [owner, setOwner] = useState('');
  const [balance, setBalance] = useState('');
  const [votes, setVotes] = useState({ Elon: 0, Mark: 0, Sam: 0 });
  const [remainingVotes, setRemainingVotes] = useState(5);
  const [alert, setAlert] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [winners, setWinners] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [winner, setWinner] = useState('');
  const [votingEnded, setVotingEnded] = useState(false);
  // const [isDestroyed, setIsDestroyed] = useState(false);
  let isDestroyedDirectAssignment = true;
  
  const isDestroyedRef = useRef(false); // Ref to track isDestroyed variable




  const loadBlockchainData = useCallback(async () => {
    const accounts = await web3.eth.requestAccounts();
    setAccount(accounts[0]);
    const contractOwner = await lottery.methods.owner().call();
    console.log(contractOwner);

   
       
   
    if (contractOwner.toLowerCase() && contractOwner.toLowerCase() !== '0x0000000000000000000000000000000000000000') {
      setOwner(contractOwner.toLowerCase());
    } else {
      //setOwner(accounts[0].toLowerCase());
      setOwner('0x153dfef4355E823dCB0FCc76Efe942BefCa86477');
    }
   // Set contract owner or fallback to the connected account

    const contractBalance = await web3.eth.getBalance(lottery.options.address);
    setBalance(Number(web3.utils.fromWei(contractBalance, 'ether')));

     const elonVotes = await lottery.methods.getVotes('Elon').call();
     const markVotes = await lottery.methods.getVotes('Mark').call();
    const samVotes = await lottery.methods.getVotes('Sam').call();
     setVotes({ Elon: Number(elonVotes), Mark: Number(markVotes), Sam: Number(samVotes) });

    const remaining = await lottery.methods.getRemainingVotes(accounts[0]).call();
    console.log(remaining)
    setRemainingVotes(Number(remaining));

    const pastWinners = await lottery.methods.getWinners().call();
    setWinners(pastWinners);

    const votingEndedState = await lottery.methods.votingEnded().call();
    setVotingEnded(votingEndedState);

    var isDestroyedState = await lottery.methods.isDestroyed().call();
    isDestroyedRef.current =isDestroyedState;
    console.log(isDestroyedRef.current +"----------------" + isDestroyedState);
    

    const currentWinner = await lottery.methods.winner().call();
    setWinner(currentWinner);
  }, []);

  useEffect(() => {
    loadBlockchainData();
    const interval = setInterval(loadBlockchainData, 10000); // Polling every 10 seconds
    return () => clearInterval(interval); // Clear interval on component unmount
  }, [loadBlockchainData]);

  const vote = async (proposal) => {
    if (remainingVotes > 0 && account) {
      try {
        setAlert(account);
        await lottery.methods.vote(proposal).send({ from: account, value: web3.utils.toWei('0.01', 'ether') });
        setRemainingVotes(remainingVotes - 1);
        setAlert(`Voted for ${proposal}`);
        loadBlockchainData();
      } catch (error) {
        setAlert('Transaction failed' + error);
      }
    } else {
      setAlert('No remaining votes or not connected to the blockchain');
    }
  };

  const declareWinner = async () => {
    if (account === owner) {
      try {
        await lottery.methods.declareWinner().send({ from: account });
        setAlert('Winner declared');
        loadBlockchainData();
      } catch (error) {
        setAlert('Transaction failed');
      }
    }
  };

  const withdrawFunds = async () => {
    if (account === owner) {
      try {
        await lottery.methods.withdrawFunds().send({ from: account });
        setAlert('Funds withdrawn');
        loadBlockchainData();
      } catch (error) {
        setAlert('Transaction failed');
      }
    }
  };

  const resetVoting = async () => {
    if (account === owner) {
      try {
        await lottery.methods.resetVoting().send({ 
          from: account, 
        });
        setAlert('Voting reset');
        setRemainingVotes(5);
        loadBlockchainData();
      } catch (error) {
        console.error("Transaction failed:", error); // Log detailed error
        setAlert('Transaction failed');
      }
    } else {
      setAlert('Only the owner can reset the voting');
    }
  };
  
  // const resetVoting = async () => {
  //   if (account === owner) {
  //     try {
  //       await lottery.methods.resetVoting().send({ from: account });
  //       setAlert('Voting reset');
  //       setRemainingVotes(5);
  //       loadBlockchainData();
  //     } catch (error) {
  //       setAlert('Transaction failed');
  //     }
  //   }
  // };

  const changeOwner = async () => {
    if (account === owner && newOwner) {
      try {
        await lottery.methods.changeOwner(newOwner).send({ from: account });
        setAlert('Owner changed');
        setOwner(newOwner); // Update the owner state

        loadBlockchainData();
      } catch (error) {
        setAlert('Transaction failed');
      }
    }
  };

  const destroyContract = async () => {
    if (account === owner) {
      try {
        await lottery.methods.destroyContract().send({ from: account });
        setAlert('Contract destroyed');
        loadBlockchainData();
      } catch (error) {
        setAlert('Transaction failed');
      }
    }
  };


  const renderVotes = () => {
    return (
      <div>
        <h3>Votes:</h3>
        <p style={winner === 'Elon' && votingEnded  ? { fontWeight: 'bold' } : {}}>Elon: {votes.Elon}</p>
        <p style={winner === 'Mark' && votingEnded  ? { fontWeight: 'bold' } : {}}>Mark: {votes.Mark}</p>
        <p style={winner === 'Sam' && votingEnded ? { fontWeight: 'bold' } : {}}>Sam: {votes.Sam}</p>
        {account === owner ? null :  <p>Remaining Votes: {remainingVotes}</p>}

      </div>
    );
  };

  const renderVoteButton = (proposal) => (
    <Button variant="primary" onClick={() => vote(proposal)} disabled={remainingVotes === 0 || account === owner || votingEnded || isDestroyedRef.current}>
      Vote for {proposal}
    </Button>
  );

  const renderWinners = () => {
    if (winners.length === 0) {
      return <p>No completed votes yet.</p>;
    }

    const sortedWinners = [...winners].sort((a, b) => Number(b.votes) - Number(a.votes));



    return sortedWinners.slice(0, 10).map((winner, index) => {
      // Ensure BigInt values are converted to Number
      const round = Number(winner.round);
      const votes = Number(winner.votes);
  
      return (
        <p key={index}>Round {round}: {winner.proposal} with {votes} votes</p>
      );
    });
    // return winners.map((winner, index) => (
    //   <p key={index}>Round {winner.round}: {winner.proposal} with {winner.votes} votes</p>
    // ));
  };

  

  return (
    <Container>
      <Row className="my-3">
        <Col>
          <h1>Voting DApp</h1>
          {alert && <Alert variant="info">{alert}</Alert>}
          <p>Connected account: {account}</p>
          <p>Contract owner: {owner}</p>
          <p>Contract balance: {Number(balance)} ETH</p>
        </Col>
      </Row>
      <Row>
        <Col>{renderVoteButton('Elon')}</Col>
        <Col>{renderVoteButton('Mark')}</Col>
        <Col>{renderVoteButton('Sam')}</Col>
      </Row>
      <Row className="my-3">
        <Col>
        
          <Button style={{ marginRight: '12px', marginBottom: '12px' }} variant="secondary" onClick={declareWinner} disabled={account !== owner || isDestroyedRef.current}>
            Declare Winner
          </Button>
          <Button style={{ marginRight: '12px', marginBottom: '12px' }} variant="secondary" onClick={withdrawFunds} disabled={account !== owner || isDestroyedRef.current }>
            Withdraw
          </Button>
          <Button style={{ marginBottom: '12px' }} variant="secondary" onClick={resetVoting} disabled={account !== owner || !votingEnded || isDestroyedRef.current}>
            Reset
          </Button>
          <InputGroup className="mb-3">
            <FormControl
              placeholder="New owner address"
              aria-label="New owner address"
              aria-describedby="basic-addon2"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
            />
            <Button variant="secondary" onClick={changeOwner} disabled={account !== owner || !newOwner || !votingEnded || isDestroyedRef.current}>
              Change Owner
            </Button>
          </InputGroup>
          <Button variant="danger" onClick={destroyContract} disabled={account !== owner || isDestroyedRef.current}>
            Destroy
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
        {renderVotes()}
         
        </Col>
      </Row>
      <Row className="my-3">
        <Col>
          <Button variant="info" onClick={() => setShowHistory(true)}>
            History
          </Button>
        </Col>
      </Row>
      <Modal show={showHistory} onHide={() => setShowHistory(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Winners History</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {renderWinners()}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHistory(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default App;

