import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Crud } from "../target/types/crud";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("crud", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.crud as Program<Crud>;

  const owner = provider.wallet;

  it("Creates a journal entry", async () => {
    const title = "My First Entry";
    const message = "This is the message body.";

    
    const [journalEntryPda,bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(title), owner.publicKey.toBuffer()],
      program.programId
    );

      await program.methods
      .createJournalEntry(title, message)
      .accounts({
        owner: owner.publicKey,
        //systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([]) // User is default signer
      .rpc();

    // Fetch account data
    const created = await program.account.journalEntryState.fetch(journalEntryPda);
    console.log("Entry Created", created);

    assert.equal(created.message, message);


  });

  it("Updates a journal entry", async () => {
  const title = "My First Entry";
  const message = "Updated message content";

  const [journalEntryPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(title), owner.publicKey.toBuffer()],
    program.programId
  );


  // Call the update function
  await program.methods
    .updateJournalEntry(title,message)
    .accounts({
      owner: owner.publicKey
    }as any)
    .signers([]) // owner is default signer
    .rpc();

  const updated = await program.account.journalEntryState.fetch(journalEntryPda);
  console.log("Updated journal entry", updated);

  // Assertions
  assert.equal(updated.message, message);
});

it("Deletes a journal entry", async () => {
  const title = "My Second Entry";

  const [journalEntryPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(title), owner.publicKey.toBuffer()],
    program.programId
  );

  // First, create the entry to delete
  await program.methods
    .createJournalEntry(title, "Temp message")
    .accounts({
      owner: owner.publicKey,
    })
    .signers([])
    .rpc();

  //Fetch to check if created  
  const created = await program.account.journalEntryState.fetch(journalEntryPda);
  console.log("Second Entry Created", created);

  assert.equal(created.message, "Temp message");


  // Now delete it
  await program.methods
    .deleteJournalEntry(title)
    .accounts({
      owner: owner.publicKey
    })
    .signers([])
    .rpc();

  // Try fetching the deleted account - should throw error
  try {
    await program.account.journalEntryState.fetch(journalEntryPda);
    assert.fail("Account should be closed but still exists.");
  } catch (err) {
    assert.include(err.message, "Account does not exist");
  }
});

it("Multiple Entries", async ()=>{
  const entries = [
  { title: "Entry 1", message: "Message 1" },
  { title: "Entry 2", message: "Message 2" },
  { title: "Entry 3", message: "Message 3" },
];

for (const { title, message } of entries) {
  await program.methods
    .createJournalEntry(title, message)
    .accounts({
      owner: owner.publicKey,
    })
    .signers([])
    .rpc();
}

const allAccounts = await program.account.journalEntryState.all([
  {
    memcmp: {
      offset: 8, // First 8 bytes are the discriminator
      bytes: owner.publicKey.toBase58(), // Filter by owner
    },
  },
]);

for (const acc of allAccounts) {
  console.log("Title:", acc.account.title);
  console.log("Message:", acc.account.message);
}


})




});
