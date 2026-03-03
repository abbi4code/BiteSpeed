import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()


export async function findOrCreateContact(email?: string, phoneNumber?: string){

    // find any contacts if they match with either upcoming email or phNumber
    const matchingContacts = await prisma.contact.findMany({
        where: {
            OR: [
                {email: email || undefined},
                {phoneNumber: phoneNumber || undefined}
            ]
        }
    });

    console.log("matchingContacts", matchingContacts)

    // Case1: new customer 
    if(matchingContacts.length == 0){
        const newContact = await prisma.contact.create({
            data: {
                email: email,
                phoneNumber: phoneNumber,
                linkPrecedence: "primary"
            }
        });

        return {
            primaryContactId: newContact.id,
            emails: newContact.email ? [newContact.email] : [],
            phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
            secondaryContactIds: []
        }
    }

    // case2: In case customer already exists
   
    // const linkedIds = matchingContacts.map(c => c.linkedId || c.id)
    const uniquePrimaryIds = [...new Set(matchingContacts.map(c => c.linkedId || c.id))]

    // get all pri and secondary
    const allLinkedContacts = await prisma.contact.findMany({
        where: {
            OR: [
                {id: {in: uniquePrimaryIds}},
                {linkedId: {in: uniquePrimaryIds}}
            ],
        },
        orderBy: {
            createdAt: 'asc'
        }
    })

    // console.log("allLinkedContacts:", allLinkedContacts)


    //Case3 - incase we found more than one primary key, we will merge them

    const oldestPrimaryContact = allLinkedContacts[0];

    if(uniquePrimaryIds.length > 1){

        // Get all primary ids that are not oldest one 
        const newerPrimaryIds = uniquePrimaryIds.filter(id => id !== oldestPrimaryContact.id)

        await prisma.contact.updateMany({
            where: {
                id: {in: newerPrimaryIds}
            },
            data: {
                linkedId: oldestPrimaryContact.id,
                linkPrecedence: "secondary"
            }
        })

        // we have to update those secondary contacts that were pointing to newer primary
        await prisma.contact.updateMany({
            where: {id: {
                in: newerPrimaryIds
            }},
            data:{
                linkedId: oldestPrimaryContact.id
            }
        })
    }


    // We will check if either of incoming email or ph-no is new 
    const isEmailNew = email && !allLinkedContacts.some(c => c.email === email)
    const isPhnoNew = phoneNumber && !allLinkedContacts.some(c => c.phoneNumber === phoneNumber)

    let newsecondaryContact = null
    if(isEmailNew || isPhnoNew){
        newsecondaryContact = await prisma.contact.create({
            data: {
                email: email,
                phoneNumber: phoneNumber,
                linkedId: oldestPrimaryContact.id,
                linkPrecedence: "secondary"
            }
        })

    }

    const finalContactList = newsecondaryContact ? [...allLinkedContacts,newsecondaryContact] : allLinkedContacts

    const allEmails = [...new Set(finalContactList.map(c => c.email).filter(Boolean))]

    const allPhoneNo = [...new Set(finalContactList.map(c => c.phoneNumber).filter(Boolean))]

    const secondaryContactIds = finalContactList.map(c => c.id).filter( id => id !== oldestPrimaryContact.id)
    const formattedEmails = [oldestPrimaryContact.email, ...allEmails.filter(email => email !== oldestPrimaryContact.email).filter(Boolean)]
    const formattedPhoneNos = [oldestPrimaryContact.phoneNumber, ...allPhoneNo.filter(phno => phno !== oldestPrimaryContact.phoneNumber).filter(Boolean)]

    return {
        contact: {
            primaryContactId: oldestPrimaryContact.id,
            emails: formattedEmails,
            phoneNumbers: formattedPhoneNos,
            secondaryContactIds: secondaryContactIds
        }
    }

}