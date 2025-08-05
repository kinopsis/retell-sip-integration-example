const useDialSipEndpointMethod = Number(process.env.USE_DIAL_SIP_ENDPOINT_METHOD) || 0;
const assert = require('assert');
const {registerCall} = require('../../lib/utils');

assert.ok(useDialSipEndpointMethod === 1 || process.env.RETELL_TRUNK_NAME,
  // eslint-disable-next-line max-len
  'RETELL_TRUNK_NAME env required when using elastic sip trunking method; it must contain the name of the jambonz BYOC trunk that connects to retell');

// Add any phone number formatting function
const formatAnyInternationalNumber = (input) => {
  const raw = input.trim();
  const hasPlus = raw.startsWith('+');
  const hasDoubleZero = raw.startsWith('00');
  const cleaned = raw.replace(/[^\d]/g, '');

  if (hasPlus) {
    return '+' + cleaned;
  }

  if (hasDoubleZero) {
    return '+' + cleaned.slice(2);
  }

  return '+' + cleaned;
};

const service = ({logger, makeService}) => {
  const svc = makeService({path: '/retell'});

  svc.on('session:new', async(session) => {
    session.locals = {logger: logger.child({call_sid: session.call_sid})};
    const {from, to, direction, call_sid} = session;

    // Log the original and formatted numbers for debugging
    logger.info(`Original 'to' number: ${to}`);
    const formattedTo = formatGermanPhoneNumber(to);
    logger.info(`Formatted 'to' number: ${formattedTo}`);
    
    logger.info({session}, `new incoming call: ${session.call_sid}`);

    /* Send ping to keep alive websocket as some platforms timeout, 25sec as 30sec timeout is not uncommon */
    session.locals.keepAlive = setInterval(() => {
      session.ws.ping();
    }, 25000);

    let outboundFromRetell = false;
    if (session.direction === 'inbound' &&
      process.env.PSTN_TRUNK_NAME && process.env.RETELL_SIP_CLIENT_USERNAME &&
      session.sip.headers['X-Authenticated-User']) {

      /* check if the call is coming from Retell; i.e. using the sip credential we provisioned there */
      const username = session.sip.headers['X-Authenticated-User'].split('@')[0];
      if (username === process.env.RETELL_SIP_CLIENT_USERNAME) {
        logger.info(`call ${session.call_sid} is coming from Retell`);
        outboundFromRetell = true;
      }
    }
    session
      .on('/refer', onRefer.bind(null, session))
      .on('close', onClose.bind(null, session))
      .on('error', onError.bind(null, session));

    try {
      let target;
      if (outboundFromRetell) {
        /* call is coming from Retell, so we will forward it to the original dialed number */
        target = [
          {
            type: 'phone',
            number: formattedTo,
            trunk: process.env.PSTN_TRUNK_NAME
          }
        ];
      }
      else if (useDialSipEndpointMethod) {
  const retell_call_id = await registerCall(logger, {
    agent_id: process.env.RETELL_AGENT_ID,
    from,
    to: formattedTo, // Use formatted number here
    direction,
    call_sid,
    retell_llm_dynamic_variables: {
      user_name: 'John Doe',
      user_email: 'john@example.com'
    }
  });
  logger.info({retell_call_id}, 'Call registered');
  
  // Log SIP target for debugging
  const sipTargetUri = `sip:${formattedTo}@sip.jambonz.cloud`;
  logger.info(`SIP Target URI: ${sipTargetUri}`);
  
  target = [
    {
      type: 'sip',
      sipUri: sipTargetUri // Use formattedTo here
    }
  ];
}


      else {
        /* https://docs.retellai.com/make-calls/custom-telephony#method-1-elastic-sip-trunking-recommended */
        target = [
          {
            type: 'phone',
            number: formattedTo,
            trunk: process.env.RETELL_TRUNK_NAME
          }
        ];
      }

      session
        .dial({
          callerId: from,
          answerOnBridge: true,
          referHook: '/refer',
          target
        })
        .hangup()
        .send();
    } catch (err) {
      session.locals.logger.info({err}, `Error responding to incoming call: ${session.call_sid}`);
      session.close();
    }
  });
};

const onRefer = (session, evt) => {
  const {logger} = session.locals;
  const {refer_details} = evt;
  logger.info({refer_details}, `session ${session.call_sid} received refer`);

  session
    .sip_refer({
      referTo: refer_details.refer_to_user,
      referredBy: evt.to
    })
    .reply();
};

const onClose = (session, code, reason) => {
  const {logger} = session.locals;
  clearInterval(session.locals.keepAlive); // remove keep alive
  logger.info({session, code, reason}, `session ${session.call_sid} closed`);
};

const onError = (session, err) => {
  const {logger} = session.locals;
  logger.info({err}, `session ${session.call_sid} received error`);
};

module.exports = service;
