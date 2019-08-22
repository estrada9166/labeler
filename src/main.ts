import * as core from '@actions/core'
import * as github from '@actions/github' //
import * as _ from 'lodash'
import * as yaml from 'js-yaml'
import * as fs from 'fs'

type Label = {
  color: string
  default: boolean
  id: string
  name: string
  node_id: string
  url: string
}

type PRInfo = {
  nodeId: string
  state: 'commented' | 'approved' | 'changes_requested'
  labels: Label[]
  repoName: string
}

type PRAction = {
  set: string[] | undefined
  remove: string[] | undefined
}

type LabelsIdsToMutate = {
  selectedLabelsToAssign: string[]
  selectedLabelsToRemove: string[]
}

async function run() {
  try {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    const configPath = core.getInput('CONFIG_PATH', { required: true })

    const configObj: any = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'))

    if (!configObj) {
      console.log('There is no configuration to set the labels')
      return
    }

    const prInfo = getPRInfo()

    if (!prInfo) {
      console.log("There's no info for this PR")
      return
    }

    const client = new github.GitHub(token)
    const labels = await getLabels(client, prInfo.repoName)

    if (!labels.length) {
      console.log('There are no labels in this project')
      return
    }

    console.log(0, configObj)
    let githubAction
    if (prInfo.state === 'commented' && configObj.onComment) {
      console.log(1, configObj)
      githubAction = configObj.onComment
    } else if (prInfo.state === 'approved' && configObj.onApproved) {
      console.log(2, configObj)
      githubAction = configObj.onApproved
    } else if (
      prInfo.state === 'changes_requested' &&
      configObj.onChangesRequested
    ) {
      console.log(3, configObj)
      githubAction = configObj.onChangesRequested
    }

    const {
      selectedLabelsToAssign,
      selectedLabelsToRemove,
    } = getLabelsIdsToMutate(githubAction, labels)

    if (!(client && prInfo.nodeId && selectedLabelsToAssign.length)) {
      console.log('There was an error')
      return
    }

    await removeLabelsFromLabelable(
      client,
      prInfo.nodeId,
      selectedLabelsToRemove
    )
    await addLabelsToLabelable(client, prInfo.nodeId, selectedLabelsToAssign)
  } catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

function getPRInfo(): PRInfo | undefined {
  const pr = github.context.payload.pull_request
  const review = github.context.payload.review
  const repo = github.context.payload.repository
  if (!(pr && review && repo && repo.full_name)) {
    return
  }

  return {
    nodeId: pr.node_id,
    state: review.state,
    labels: pr.labels,
    repoName: repo.full_name,
  }
}

async function getLabels(
  client: github.GitHub,
  fullName: string
): Promise<Pick<Label, 'name' | 'id'>[]> {
  const [owner, repo] = fullName.split('/')
  const result = await client.graphql(
    `query Labels($repo: String!, $owner: String!) {
      repository(name: $repo, owner: $owner) {
        labels(first: 90) {
          nodes {
            id
            name
          }
        }
      }
    }
  `,
    {
      repo,
      owner,
    }
  )

  const labels = result.repository.labels.nodes
  return labels
}

function getLabelsIdsToMutate(
  action: PRAction,
  labels: Pick<Label, 'name' | 'id'>[]
): LabelsIdsToMutate {
  let selectedLabelsToAssign
  let selectedLabelsToRemove

  if (action.set) {
    selectedLabelsToAssign = _.chain(labels)
      .filter((label) => action.set!.includes(label.name))
      .map('id')
      .value()
  }

  if (action.remove) {
    selectedLabelsToRemove = _.chain(labels)
      .filter((label) => action.remove!.includes(label.name))
      .map('id')
      .value()
  }

  return {
    selectedLabelsToAssign,
    selectedLabelsToRemove,
  }
}

async function addLabelsToLabelable(
  client: github.GitHub,
  labelableNodeId: string,
  labelIds: string[]
): Promise<void> {
  await client.graphql(
    `mutation AddLabels($input: AddLabelsToLabelableInput!) {
      addLabelsToLabelable(input: $input) {
        clientMutationId
      }
    }
  `,
    {
      input: {
        labelableId: labelableNodeId,
        labelIds,
      },
    }
  )
}

async function removeLabelsFromLabelable(
  client: github.GitHub,
  labelableNodeId: string,
  labelIds: string[]
): Promise<void> {
  await client.graphql(
    `mutation RemoveLabels($input: RemoveLabelsFromLabelableInput!) {
      removeLabelsFromLabelable(input: $input) {
        clientMutationId
      }
    }
  `,
    {
      input: {
        labelableId: labelableNodeId,
        labelIds,
      },
    }
  )
}

run()
